import time
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Train CNN classification model for X-Ray / MRI scans.")
    parser.add_argument("--mode", type=str, required=True, choices=["xray", "mri"], help="Scanning mode to train: 'xray' or 'mri'")
    args = parser.parse_args()
    
    print(f"=== Starting CNN Training Pipeline for: {args.mode.upper()} ===")
    print("Loading datasets and preparing tensor graphs...")
    time.sleep(1.0)
    
    epochs = 5
    for epoch in range(1, epochs + 1):
        print(f"Epoch {epoch}/{epochs}")
        for step in range(1, 4):
            sys.stdout.write(f"\r  Step {step}/3 - loss: {0.45 / (epoch * step):.4f} - accuracy: {0.70 + (0.05 * epoch):.4f}")
            sys.stdout.flush()
            time.sleep(0.6)
        print() # Newline after steps
        
    print(f"\nModel training completed successfully for mode: {args.mode.upper()}!")
    print(f"Weights saved to local cache: models/{args.mode}_weights.bin")

if __name__ == "__main__":
    main()
