import os
for d in os.listdir('assets/web'):
    path = os.path.join('assets/web', d)
    if os.path.isdir(path):
        print(f'{d}: {os.path.isfile(os.path.join(path, "index.html"))}')
