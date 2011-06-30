

import sys
import Image
from os import walk 
from os.path import join
from itertools import chain
from collections import defaultdict
from multiprocessing import Pool

def image_hist(image_path):
    hist = defaultdict(float)
    try:
        i = Image.open(image_path)
    except IOError:
        print "failed to open %s" % image_path
        return hist

    pixels = list(i.getdata())
    # optimize not repeating if inside  
    if len(i.getbands()) == 1:
        for p in range(0, len(pixels)):
            u = pixels[p]
            hist[u] += 1.0
    else:
        for p in range(0, len(pixels)):
            u = pixels[p][0]
            hist[u] += 1.0
        
    return hist

def accum_hist(image_hist):
    curr = 0
    hist = defaultdict(float)
    for h in image_hist:
        curr+=1
        if curr%100 == 0:
            print curr
        for x in h:
            hist[x] += h[x]
    return hist
    
def files(folder):
    for path, dirs, files in walk(sys.argv[1]):
        for f in files:
            if ".png" in f:
                yield join(path, f)

if __name__ == '__main__':
    pool = Pool(processes=2)
    # map
    proccessed = pool.imap_unordered(image_hist, files(sys.argv[1]), chunksize=10)
    # reduce
    hist = accum_hist(proccessed)
    for x in hist:
        print x, hist[x]
        
