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

# %% --------
os.system('rm -rf static/stimuli')

image_paths = {}
for cat in os.listdir('image_stimuli'):
    os.makedirs(f'static/stimuli/images/{cat}')
    image_paths[cat] = []
    for i, fn in enumerate(os.listdir(f'image_stimuli/{cat}')):
        img = Image.open(f'image_stimuli/{cat}/{fn}')
        new = resize(img, 300, 300)
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

