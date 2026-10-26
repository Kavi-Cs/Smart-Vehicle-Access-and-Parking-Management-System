import os

# Path to your merged dataset
DATASET_DIR = r"C:\Users\kavee\EdgeAI_Project\datasets\smartvehicle_dataset"

def count_dataset_splits():
    splits = ['train', 'val', 'test']
    total_images = 0

    print("--- Dataset File Counts ---")
    for split in splits:
        img_dir = os.path.join(DATASET_DIR, split, 'images')
        lbl_dir = os.path.join(DATASET_DIR, split, 'labels')
        
        # Count files if the directory exists
        img_count = len(os.listdir(img_dir)) if os.path.exists(img_dir) else 0
        lbl_count = len(os.listdir(lbl_dir)) if os.path.exists(lbl_dir) else 0
        
        total_images += img_count
        
        print(f"{split.upper():<6} -> Images: {img_count:<5} | Labels: {lbl_count:<5}")

    print("-" * 27)
    print(f"TOTAL  -> Images: {total_images}")

if __name__ == '__main__':
    count_dataset_splits()