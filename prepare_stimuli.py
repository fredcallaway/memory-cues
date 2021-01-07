import os
from PIL import Image
import json

def resize(image_pil, width, height):
    '''
    Resize PIL image keeping ratio and using white background.

    https://stackoverflow.com/questions/44370469/python-image-resizing-keep-proportion-add-white-background
    '''
    ratio_w = width / image_pil.width
    ratio_h = height / image_pil.height
    if ratio_w < ratio_h:
        # It must be fixed by width
        resize_width = width
        resize_height = round(ratio_w * image_pil.height)
    else:
        # Fixed by height
        resize_width = round(ratio_h * image_pil.width)
        resize_height = height
    image_resize = image_pil.resize((resize_width, resize_height), Image.ANTIALIAS)
    background = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    offset = (round((width - resize_width) / 2), round((height - resize_height) / 2))
    background.paste(image_resize, offset)
    return background.convert('RGB')

def resize_and_crop(img, size, crop_type='middle'):
    """
    Resize and crop an image to fit the specified size.
    args:
        img_path: path for the image to resize.
        size: `(width, height)` tuple.
        crop_type: can be 'top', 'middle' or 'bottom', depending on this
            value, the image will cropped getting the 'top/left', 'midle' or
            'bottom/rigth' of the image to fit the size.
    raises:
        Exception: if can not open the file in img_path of there is problems
            to save the image.
        ValueError: if an invalid `crop_type` is provided.

    adapted from https://gist.github.com/sigilioso/2957026
    """

    # If height is higher we resize vertically, if not we resize horizontally
    # Get current and desired ratio for the images
    img_ratio = img.size[0] / img.size[1]
    ratio = size[0] / float(size[1])
    #The image is scaled/cropped vertically or horizontally depending on the ratio
    if ratio > img_ratio:
        img = img.resize((size[0], size[0] * img.size[1] // img.size[0]),
                Image.ANTIALIAS)
        # Crop in the top, middle or bottom
        if crop_type == 'top':
            box = (0, 0, img.size[0], size[1])
        elif crop_type == 'middle':
            box = (0, (img.size[1] - size[1]) // 2, img.size[0], (img.size[1] + size[1]) // 2)
        elif crop_type == 'bottom':
            box = (0, img.size[1] - size[1], img.size[0], img.size[1])
        else :
            raise ValueError('ERROR: invalid value for crop_type')
        img = img.crop(box)
    elif ratio < img_ratio:
        img = img.resize((size[1] * img.size[0] // img.size[1], size[1]),
                Image.ANTIALIAS)
        # Crop in the top, middle or bottom
        if crop_type == 'top':
            box = (0, 0, size[0], img.size[1])
        elif crop_type == 'middle':
            box = ((img.size[0] - size[0]) // 2, 0, (img.size[0] + size[0]) // 2, img.size[1])
        elif crop_type == 'bottom':
            box = (img.size[0] - size[0], 0, img.size[0], img.size[1])
        else :
            raise ValueError('ERROR: invalid value for crop_type')
        img = img.crop(box)
    else:
        img = img.resize((size[0], size[1]),
                Image.ANTIALIAS)
    return img

# %% --------
os.system('rm -rf static/stimuli')

image_paths = {}
for cat in os.listdir('image_stimuli'):
    os.makedirs(f'static/stimuli/images/{cat}')
    image_paths[cat] = []
    for i, fn in enumerate(os.listdir(f'image_stimuli/{cat}')):
        img = Image.open(f'image_stimuli/{cat}/{fn}')
        new = resize_and_crop(img, (300, 300))
        path = f'static/stimuli/images/{cat}/{fn}'
        image_paths[cat].append(path)
        new.save(path)

image_paths
# %% --------
def get_words(path):
    with open(path) as f:
        return [w.strip() for w in f.readlines()]


with open('static/stimuli/stimuli.json', 'w+') as f:
    json.dump({
        'words': {
            'low': get_words('word_stimuli/high_mem_words.txt'),
            'high': get_words('word_stimuli/low_mem_words.txt')
        },
        'images': image_paths,
    }, f)

