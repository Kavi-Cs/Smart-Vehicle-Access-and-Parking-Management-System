import os
import shutil
import random

# Works in both Windows (PowerShell/CMD) and WSL/Linux
DATASET_DIR = os.path.abspath("datasets/smartvehicle_dataset")

def reorganize_merged_dataset():
    if not os.path.exists(DATASET_DIR):
        print(f"Error: Directory does not exist at {DATASET_DIR}")
        print("Please ensure you moved 'datasets' out of 'PH3042_Robotics_env' into 'EdgeAI_Project'.")
        return

    # Create target split directories
    splits = ['train', 'val', 'test']
    for split in splits:
        os.makedirs(os.path.join(DATASET_DIR, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(DATASET_DIR, split, 'labels'), exist_ok=True)

    # Find all image files currently in the root dataset directory
    all_files = os.listdir(DATASET_DIR)
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp')
    images = [f for f in all_files if f.lower().endswith(image_extensions)]

    if not images:
        print("No image files found directly inside smartvehicle_dataset!")
        return

    # Shuffle to split randomly
    random.seed(42)
    random.shuffle(images)

    total = len(images)
    train_count = int(total * 0.7)
    val_count = int(total * 0.2)

    train_imgs = images[:train_count]
    val_imgs = images[train_count:train_count + val_count]
    test_imgs = images[train_count + val_count:]

    split_map = {
        'train': train_imgs,
        'val': val_imgs,
        'test': test_imgs
    }

    moved_count = 0
    missing_labels = 0

    for split_name, img_list in split_map.items():
        for img_name in img_list:
            base_name = os.path.splitext(img_name)[0]
            txt_name = base_name + ".txt"

            src_img = os.path.join(DATASET_DIR, img_name)
            src_txt = os.path.join(DATASET_DIR, txt_name)

            dst_img = os.path.join(DATASET_DIR, split_name, 'images', img_name)
            dst_txt = os.path.join(DATASET_DIR, split_name, 'labels', txt_name)

            # Move image file
            shutil.move(src_img, dst_img)

            # Move corresponding label file if present
            if os.path.exists(src_txt):
                shutil.move(src_txt, dst_txt)
            else:
                missing_labels += 1

            moved_count += 1

    print(f"\n--- Reorganization Successful ---")
    print(f"Total images sorted: {moved_count}")
    print(f"Train: {len(train_imgs)} | Val: {len(val_imgs)} | Test: {len(test_imgs)}")
    if missing_labels > 0:
        print(f"Note: {missing_labels} images had no corresponding .txt label file.")

    # Generate YOLO configuration file using normalized forward slashes
    yaml_content = f"""path: {DATASET_DIR.replace('\\', '/')}
train: train/images
val: val/images
test: test/images

nc: 1
names: ['license_plate']
"""
    yaml_path = os.path.join(DATASET_DIR, 'data.yaml')
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

    print(f"Generated data.yaml at: {yaml_path}")

if __name__ == '__main__':
    reorganize_merged_dataset()