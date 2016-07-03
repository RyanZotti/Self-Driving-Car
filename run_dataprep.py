from dataprep import data_prep
import argparse

ap = argparse.ArgumentParser()
ap.add_argument("-d", "--datapath", required = True,
    help = "path to where the face cascade resides")
args = vars(ap.parse_args())
data_path = args["datapath"]

data_prep(data_path)