"""
Generates and caches authentic calibration snapshot JSONs for IBM Sherbrooke (127Q)
and IBM Brisbane (127Q) using genuine IBM FakeProvider backends.
"""
import os
import json
import logging
from caliroute.src.collect.snapshot_calibration import get_backend_instance, extract_calibration_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("generate_reference_calibrations")

def generate():
    out_dir = os.path.join("caliroute", "data", "raw", "calibration")
    os.makedirs(out_dir, exist_ok=True)

    backends = ["ibm_sherbrooke", "ibm_brisbane"]
    for b_id in backends:
        logger.info("Extracting %s...", b_id)
        backend, is_mock = get_backend_instance(b_id)
        calib = extract_calibration_data(backend, is_mock)
        calib["metadata"]["backend_name"] = b_id
        target_path = os.path.join(out_dir, f"calibration_{b_id}_latest.json")
        with open(target_path, "w") as f:
            json.dump(calib, f, indent=2)
        logger.info("Saved %s with %d qubits and %d coupling edges.", target_path, calib["metadata"]["num_qubits"], len(calib["coupling_map"]))

if __name__ == "__main__":
    generate()
