from sklearn.metrics import mean_squared_error
from math import sqrt
import numpy as np
import pandas as pd

df =pd.read_csv('./df.csv')
cols = ['angle','angle_model','throttle','throttle_model']
df[cols] = df[cols].astype(float)

rmse = sqrt(mean_squared_error(df['angle'], df['angle_model']))
print(rmse)

np.mean(((df['angle'] - df['angle_model']) ** 2)) ** 0.05