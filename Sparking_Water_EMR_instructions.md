## Instructions

Log into AWS and go to the EMR console. Create an EMR Spark cluster. I chose emr-4.7.1, since it comes with Spark 1.6.1, which is compatible with the latest version of H2O's Sparkling Water. I chose 8 m3.xlarge instances, which right now are $0.27 per instance per hour. Make sure you select security groups that let you ssh into the servers. 

Run thes
	
	# Log in as Hadoop user and make ec2-user directories
	# If you don't do this step your Spark code will immediately fail with permission issues
	sudo su
	su hadoop
	hadoop fs -mkdir -p /user/ec2-user
	hadoop fs -chown ec2-user /user/ec2-user
	
	# Now back to being ec2-user
	
	# Download Sparking Water to /home/ec2-user/
	wget http://h2o-release.s3.amazonaws.com/sparkling-water/rel-1.6/8/sparkling-water-1.6.8.zip
	
	# Unzip the file
	unzip sparkling-water-1.6.8.zip
	
	sudo pip install h2o_pysparkling_1.6
	sudo pip install tabulate
	sudo pip install six
	sudo pip install future
	
	export SPARK_HOME=/usr/lib/spark
	export HADOOP_CONF_DIR=/etc/hadoop/conf
	export MASTER="yarn-client"
	
	# Start up pysparking
	/home/ec2-user/sparkling-water-1.6.8/bin/pysparkling