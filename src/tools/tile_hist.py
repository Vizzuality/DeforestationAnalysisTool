

import sys
import Image
from os import walk 
from os.path import join
from itertools import chain
from collections import defaultdict
from multiprocessing import Pool
from pipe import Pipe

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

@Pipe
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
    for path, dirs, files in walk(folder):
        for f in files:
            yield join(path, f)

@Pipe
def filter_by_ext(iterable, ext):
    for f in iterable:
        if f.endswith(ext):
            yield f

@Pipe
def parallel(iterable, fn, processes=2):
    pool = Pool(processes=processes)
    for x in pool.imap_unordered(fn, iterable, chunksize=10):
        yield x

@Pipe
def print_hist(hist):
    for x in hist:
        print x, hist[x]

if __name__ == '__main__':
    files(sys.argv[1]) | filter_by_ext('.png') | parallel(image_hist) | accum_hist | print_hist

    """
    pool = Pool(processes=2)
    # map
    proccessed = pool.imap_unordered(image_hist, files(sys.argv[1]), chunksize=10)
    # reduce
    hist = accum_hist(proccessed)
    for x in hist:
        print x, hist[x]
    """
        
