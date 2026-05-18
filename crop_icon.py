from PIL import Image

def crop_to_square(image_path, output_path):
    img = Image.open(image_path)
    width, height = img.size
    new_size = min(width, height)
    left = (width - new_size) / 2
    top = (height - new_size) / 2
    right = (width + new_size) / 2
    bottom = (height + new_size) / 2
    
    img = img.crop((left, top, right, bottom))
    img.save(output_path)

crop_to_square('moodYard.jpeg', 'moodYard_square.jpeg')
