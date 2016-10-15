from pysparkling import *
from h2o.estimators.gbm import H2OGradientBoostingEstimator as GBM

'''
This link might be helpful
http://learn.h2o.ai/content/tutorials/pysparkling/Chicago_Crime_Demo.html
'''

def remove_pandas_index_column(line):
    line = str(line).split(",")
    line = line[1:] # Remove Pandas index column
    return line

def contains_target(row):
    answer = False
    if len(set(['Up','Left','Right']).intersection(row)) > 0:
        answer = True
    return answer

def make_float_predictors(old_line):
    # Convert only predictors to floats. Do not convert target, which is last element
    new_line = [float(str(x)) for x in old_line[:len(old_line)-1]]
    # Append the target, which is a class (ie String) and not a float
    new_line.append(old_line[-1])
    return new_line


# Create H2O context for use later
hc = H2OContext(sc)

# Pull the data from S3
rdd = sc.textFile("s3n://self-driving-car/data/*/predictors_and_targets.csv")

# Remove index column
rdd = rdd.map(remove_pandas_index_column)

# Remove the header rows, which are easy to find because they won't have target values
rdd = rdd.filter(contains_target)

# Convert predictor values from String to Float
rdd = rdd.map(lambda line: make_float_predictors(line))

# Create predictor column names
column_names = [str(x) for x in list(range(230400))]

# Add on the target column to make a complete list of column names
column_names.append('target')

# Use the programmatically-generated column names to make a dataframe
df = rdd.toDF(column_names)

# Optionally print the quanity of columns in your dataframe
df.columns

# Optionally print column data types. Note that Spark intelligentlly
# identifies that the predictor columns are double because I had
# made all of them rdd elements double (above). This saved me from
# having to write really ugly Spark casting code
df.schema.fields

# Convert the Spark DataFrame to something that H2O can ingest
df_h2o = hc.as_h2o_frame(df,"df_h2o")

'''



'''

predictors = column_names[:-1]
response = column_names[-1]

ratios = [0.6,0.2]
h2o_frame_splits = df_h2o.split_frame(ratios,seed=12345)
train = h2o_frame_splits[0]
train.frame_id = "Train"
valid = h2o_frame_splits[2]
valid.frame_id = "Validation"
test = h2o_frame_splits[1]
test.frame_id = "Test"

model = GBM(ntrees=50,max_depth=6,learn_rate=0.1,distribution="multinomial")
model.train(x=predictors,y=response,training_frame=train,validation_frame=valid)