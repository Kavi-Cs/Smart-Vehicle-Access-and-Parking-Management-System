import os
import shutil

# Paths configured for your WSL environment
SOURCE_MASTER_DIR = "/mnt/c/Users/kavee/Downloads/New folder (10)"
TARGET_DIR = "/mnt/c/Users/kavee/EdgeAI_Project/datasets/smartvehicle_dataset"

def merge_yolov8_datasets():
    # 1. Clean and setup target directories
    if os.path.exists(TARGET_DIR):
        print(f"Clearing old dataset at {TARGET_DIR}...")
        shutil.rmtree(TARGET_DIR)
        
    splits = ['train', 'val', 'test']
    for split in splits:
        os.makedirs(os.path.join(TARGET_DIR, split, 'images'))
        os.makedirs(os.path.join(TARGET_DIR, split, 'labels'))

    total_images_copied = 0
    missing_labels = 0

    # 2. Iterate through each downloaded dataset folder
    dataset_folders = [f for f in os.listdir(SOURCE_MASTER_DIR) if os.path.isdir(os.path.join(SOURCE_MASTER_DIR, f))]
    
    for ds_idx, ds_name in enumerate(dataset_folders):
        ds_path = os.path.join(SOURCE_MASTER_DIR, ds_name)
        print(f"Processing Dataset {ds_idx + 1}/{len(dataset_folders)}: {ds_name}")

        # Roboflow sometimes names the validation folder 'valid' instead of 'val'
        source_splits = ['train', 'val', 'valid', 'test']
        
        for split in source_splits:
            split_path = os.path.join(ds_path, split)
            if not os.path.exists(split_path):
                continue
                
            target_split = 'val' if split == 'valid' else split
            
            img_dir = os.path.join(split_path, 'images')
            lbl_dir = os.path.join(split_path, 'labels')
            
            if not os.path.exists(img_dir) or not os.path.exists(lbl_dir):
                continue

            # 3. Copy files and rename to avoid conflicts
            for img_file in os.listdir(img_dir):
                if not img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue
                    
                base_name = os.path.splitext(img_file)[0]
                txt_file = base_name + ".txt"
                
                src_img_path = os.path.join(img_dir, img_file)
                src_txt_path = os.path.join(lbl_dir, txt_file)
                
                # Check if matching label exists
                if os.path.exists(src_txt_path):
                    # Prepend dataset index to guarantee unique filenames
                    unique_img_name = f"ds{ds_idx}_{img_file}"
                    unique_txt_name = f"ds{ds_idx}_{txt_file}"
                    
                    dst_img_path = os.path.join(TARGET_DIR, target_split, 'images', unique_img_name)
                    dst_txt_path = os.path.join(TARGET_DIR, target_split, 'labels', unique_txt_name)
                    
                    shutil.copy2(src_img_path, dst_img_path)
                    shutil.copy2(src_txt_path, dst_txt_path)
                    
                    total_images_copied += 1
                else:
                    missing_labels += 1

    print(f"\n--- Merge Complete ---")
    print(f"Total valid image-label pairs copied: {total_images_copied}")
    if missing_labels > 0:
        print(f"Skipped {missing_labels} images because they lacked .txt label files.")

    # 4. Generate the final data.yaml
    yaml_content = f"""path: {TARGET_DIR}
train: train/images
val: val/images
test: test/images

nc: 1
names: ['license_plate']
"""
    yaml_path = os.path.join(TARGET_DIR, 'data.yaml')
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)

    print(f"Generated data.yaml at: {yaml_path}")

if __name__ == '__main__':
    merge_yolov8_datasets()