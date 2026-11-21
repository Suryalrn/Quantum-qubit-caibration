"""
GNN Fidelity Scorer for CaliRoute.

Architecture:
- Hardware Graph Encoder: GNN message passing over physical processor topology
  conditioned on physical calibration metrics (T1, T2, readout error, 2Q gate errors).
- Circuit Graph Encoder: GNN message passing over logical interaction graph
  capturing logical qubit roles and two-qubit interaction density.
- Candidate Mapping Alignment Head: Combines mapped node embeddings, physical distance
  and edge metrics along interaction links, and predicts log-fidelity.
- Fast Batched Inference: Embeddings are computed once per circuit/hardware pair,
  allowing evaluation of hundreds of candidate mappings in parallel for beam search.
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional, Union, List, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv, GATConv

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class HardwareGraphEncoder(nn.Module):
    """Encodes physical superconducting hardware topology and calibration telemetry."""

    def __init__(
        self,
        node_dim: int = 3,
        edge_dim: int = 2,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        self.node_proj = nn.Linear(node_dim, hidden_dim)
        self.edge_proj = nn.Linear(edge_dim, hidden_dim)

        self.convs = nn.ModuleList([
            GCNConv(hidden_dim, hidden_dim) for _ in range(num_layers)
        ])
        self.norms = nn.ModuleList([
            nn.LayerNorm(hidden_dim) for _ in range(num_layers)
        ])
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor, edge_attr: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Args:
            x: [N_hw, node_dim] node calibration features (T1, T2, readout_error)
            edge_index: [2, E_hw] physical coupling map
            edge_attr: [E_hw, edge_dim] coupling edge metrics (gate_error, gate_length)

        Returns:
            h_hw: [N_hw, hidden_dim] physical qubit representations
        """
        h = F.relu(self.node_proj(x))
        for conv, norm in zip(self.convs, self.norms):
            h_next = conv(h, edge_index)
            h = norm(F.relu(h_next) + h)
            h = self.dropout(h)
        return h


class CircuitGraphEncoder(nn.Module):
    """Encodes logical circuit interaction topology and gate densities."""

    def __init__(
        self,
        node_dim: int = 3,
        edge_dim: int = 2,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        self.node_proj = nn.Linear(node_dim, hidden_dim)
        self.edge_proj = nn.Linear(edge_dim, hidden_dim)

        self.convs = nn.ModuleList([
            GCNConv(hidden_dim, hidden_dim) for _ in range(num_layers)
        ])
        self.norms = nn.ModuleList([
            nn.LayerNorm(hidden_dim) for _ in range(num_layers)
        ])
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor, edge_attr: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Args:
            x: [n_circ, node_dim] logical qubit features
            edge_index: [2, E_circ] logical interaction edges
            edge_attr: [E_circ, edge_dim] interaction counts and frequencies

        Returns:
            h_circ: [n_circ, hidden_dim] logical qubit representations
        """
        h = F.relu(self.node_proj(x))
        if edge_index.numel() > 0:
            for conv, norm in zip(self.convs, self.norms):
                h_next = conv(h, edge_index)
                h = norm(F.relu(h_next) + h)
                h = self.dropout(h)
        return h


class GNNScorer(nn.Module):
    """
    Classical Graph Neural Network Scoring Model for CaliRoute.

    Predicts the algebraic log-fidelity of placing an n-qubit quantum circuit
    onto a physical superconducting processor according to a candidate mapping.
    """

    def __init__(
        self,
        hw_node_dim: int = 3,
        hw_edge_dim: int = 2,
        circ_node_dim: int = 3,
        circ_edge_dim: int = 2,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.hw_encoder = HardwareGraphEncoder(
            node_dim=hw_node_dim,
            edge_dim=hw_edge_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout
        )
        self.circ_encoder = CircuitGraphEncoder(
            node_dim=circ_node_dim,
            edge_dim=circ_edge_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout
        )

        # Node cross-representation: [h_circ, h_hw, x_circ, x_hw]
        node_in_dim = hidden_dim * 2 + circ_node_dim + hw_node_dim
        self.node_mlp = nn.Sequential(
            nn.Linear(node_in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim)
        )

        # Edge cross-representation: [z_u, z_v, circ_edge_attr, dist, is_connected, edge_err]
        # edge_attr: 2, dist: 1, is_connected: 1, edge_err: 1 -> total extra = 5
        edge_in_dim = hidden_dim * 2 + circ_edge_dim + 3
        self.edge_mlp = nn.Sequential(
            nn.Linear(edge_in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim)
        )

        # Readout head predicting log-fidelity
        # Inputs: pooled_nodes (mean + max = 2 * hidden_dim) + pooled_edges (mean = hidden_dim)
        head_in_dim = hidden_dim * 3
        self.head = nn.Sequential(
            nn.Linear(head_in_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1)
        )

    def encode(
        self,
        hw_graph: Data,
        circ_graph: Data
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Encodes the hardware and circuit graphs into node embedding matrices.
        """
        h_hw = self.hw_encoder(hw_graph.x, hw_graph.edge_index, getattr(hw_graph, "edge_attr", None))
        h_circ = self.circ_encoder(circ_graph.x, circ_graph.edge_index, getattr(circ_graph, "edge_attr", None))
        return h_hw, h_circ

    def score_mappings(
        self,
        h_hw: torch.Tensor,
        h_circ: torch.Tensor,
        hw_x: torch.Tensor,
        circ_x: torch.Tensor,
        circ_edge_index: torch.Tensor,
        circ_edge_attr: Optional[torch.Tensor],
        mappings: torch.Tensor,
        dist_matrix: Optional[torch.Tensor] = None,
        err_matrix: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Scores a batch of candidate mappings using precomputed node embeddings.

        Args:
            h_hw: [N_hw, hidden_dim]
            h_circ: [n_circ, hidden_dim]
            hw_x: [N_hw, hw_node_dim]
            circ_x: [n_circ, circ_node_dim]
            circ_edge_index: [2, E_circ]
            circ_edge_attr: [E_circ, circ_edge_dim] or None
            mappings: [B, n_circ] long tensor of physical qubit indices
            dist_matrix: [N_hw, N_hw] shortest-path physical distances
            err_matrix: [N_hw, N_hw] 2Q gate error lookup

        Returns:
            scores: [B] tensor of predicted log-fidelities
        """
        if mappings.dim() == 1:
            mappings = mappings.unsqueeze(0)
            squeeze_output = True
        else:
            squeeze_output = False

        B, n_circ = mappings.shape
        device = mappings.device

        # 1. Gather mapped hardware embeddings and features for each logical qubit
        # mappings: [B, n_circ] -> gather from [N_hw, hidden_dim]
        # mapped_h_hw: [B, n_circ, hidden_dim]
        mapped_h_hw = h_hw[mappings]
        mapped_hw_x = hw_x[mappings]

        # Expand circuit representations to batch: [B, n_circ, hidden_dim]
        h_circ_exp = h_circ.unsqueeze(0).expand(B, -1, -1)
        circ_x_exp = circ_x.unsqueeze(0).expand(B, -1, -1)

        # Concatenate node features: [B, n_circ, node_in_dim]
        node_cat = torch.cat([h_circ_exp, mapped_h_hw, circ_x_exp, mapped_hw_x], dim=-1)
        z_nodes = self.node_mlp(node_cat)  # [B, n_circ, hidden_dim]

        # Node pooling: mean and max over logical qubits
        z_mean = z_nodes.mean(dim=1)  # [B, hidden_dim]
        z_max, _ = z_nodes.max(dim=1)   # [B, hidden_dim]

        # 2. Process Interaction Edges
        E_circ = circ_edge_index.shape[1] if circ_edge_index.numel() > 0 else 0
        if E_circ > 0:
            u_log = circ_edge_index[0]  # [E_circ]
            v_log = circ_edge_index[1]  # [E_circ]

            # Physical qubits mapped to u and v across all batch elements: [B, E_circ]
            u_phys = mappings[:, u_log]
            v_phys = mappings[:, v_log]

            # Lookup physical distance
            if dist_matrix is not None:
                dist = dist_matrix[u_phys, v_phys].unsqueeze(-1).float()  # [B, E_circ, 1]
            else:
                dist = torch.ones((B, E_circ, 1), device=device)

            is_connected = (dist == 1.0).float()

            # Lookup 2Q gate error
            if err_matrix is not None:
                edge_err = err_matrix[u_phys, v_phys].unsqueeze(-1).float()
            else:
                edge_err = torch.full((B, E_circ, 1), 0.01, device=device)

            # Circuit edge attributes
            if circ_edge_attr is not None and circ_edge_attr.numel() > 0:
                attr_exp = circ_edge_attr.unsqueeze(0).expand(B, -1, -1)
            else:
                attr_exp = torch.zeros((B, E_circ, 2), device=device)

            # Node features at edge endpoints
            z_u = z_nodes[:, u_log, :]  # [B, E_circ, hidden_dim]
            z_v = z_nodes[:, v_log, :]  # [B, E_circ, hidden_dim]

            # Concatenate edge features
            edge_cat = torch.cat([z_u, z_v, attr_exp, dist, is_connected, edge_err], dim=-1)
            z_edges = self.edge_mlp(edge_cat)  # [B, E_circ, hidden_dim]
            e_mean = z_edges.mean(dim=1)       # [B, hidden_dim]
        else:
            e_mean = torch.zeros((B, self.hidden_dim), device=device)

        # 3. Overall Scoring Head
        combined = torch.cat([z_mean, z_max, e_mean], dim=-1)  # [B, 3 * hidden_dim]
        scores = self.head(combined).squeeze(-1)              # [B]

        if squeeze_output:
            return scores.squeeze(0)
        return scores

    def forward(
        self,
        hw_graph: Data,
        circ_graph: Data,
        mapping: Union[torch.Tensor, List[int], Dict[int, int], List[Dict[int, int]]],
        dist_matrix: Optional[torch.Tensor] = None,
        err_matrix: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Full forward pass: encodes graphs and evaluates mapping(s).
        """
        device = hw_graph.x.device
        h_hw, h_circ = self.encode(hw_graph, circ_graph)

        # Parse mapping into [B, n_circ] tensor
        n_circ = circ_graph.num_nodes
        if isinstance(mapping, dict):
            # Single dict {logical: physical}
            m_list = [mapping[i] for i in range(n_circ)]
            m_tensor = torch.tensor([m_list], dtype=torch.long, device=device)
        elif isinstance(mapping, list) and len(mapping) > 0 and isinstance(mapping[0], dict):
            # List of dicts
            m_lists = [[m[i] for i in range(n_circ)] for m in mapping]
            m_tensor = torch.tensor(m_lists, dtype=torch.long, device=device)
        elif isinstance(mapping, list) and (len(mapping) == 0 or isinstance(mapping[0], (int, float))):
            m_tensor = torch.tensor([mapping], dtype=torch.long, device=device)
        elif isinstance(mapping, torch.Tensor):
            m_tensor = mapping.to(device)
            if m_tensor.dim() == 1:
                m_tensor = m_tensor.unsqueeze(0)
        else:
            raise ValueError(f"Unsupported mapping type: {type(mapping)}")

        scores = self.score_mappings(
            h_hw=h_hw,
            h_circ=h_circ,
            hw_x=hw_graph.x,
            circ_x=circ_graph.x,
            circ_edge_index=circ_graph.edge_index,
            circ_edge_attr=getattr(circ_graph, "edge_attr", None),
            mappings=m_tensor,
            dist_matrix=dist_matrix,
            err_matrix=err_matrix
        )

        if m_tensor.shape[0] == 1 and not (isinstance(mapping, list) and len(mapping) > 0 and isinstance(mapping[0], dict)):
            return scores.squeeze(0)
        return scores

    @torch.no_grad()
    def predict_fidelity(
        self,
        hw_graph: Data,
        circ_graph: Data,
        mapping: Union[torch.Tensor, List[int], Dict[int, int]],
        dist_matrix: Optional[torch.Tensor] = None,
        err_matrix: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Returns predicted fidelity in [0, 1] via exp(log_fidelity).
        """
        log_fid = self.forward(hw_graph, circ_graph, mapping, dist_matrix, err_matrix)
        # Cap log_fidelity to <= 0.0 (fidelity <= 1.0)
        log_fid = torch.clamp(log_fid, max=0.0)
        return torch.exp(log_fid)
