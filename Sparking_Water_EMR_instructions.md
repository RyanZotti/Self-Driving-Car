## Instructions

Log into AWS and go to the EMR console. Create an EMR Spark cluster. I chose emr-4.7.1, since it comes with Spark 1.6.1, which is compatible with the latest version of H2O's Sparkling Water. I chose 8 m3.xlarge instances, which right now are $0.27 per instance per hour. Make sure you select security groups that let you ssh into the servers. 

Run thes
	
	# Log in as Hadoop user and make ec2-user directories
	# If you don't do this step your Spark code will immediately fail with permission issues
	sudo su hadoop
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
	/home/ec2-user/sparkling-water-1.6.8/bin/pysparkling --deploy-mode client
	
	# Note the shell's tracking URL, which will look something like this:
	http://ip-10-0-0-123.ec2.internal:20888/proxy/application_1477154041215_0004/
	
	# Open up a new Terminal tab. We're doing to do port forwarding / ssh tunneling to view the Spark UI
	ssh -i /Users/ryanzotti/Documents/private_keys/ML.pem -L 20888:[localhost]:20888 ec2-user@54.146.60.80
	
	# Open up your web browser to the tracking URL. Replace the IP with localhost
	http://localhost:20888/proxy/application_1477154041215_0004/
	
	
## FAQ

**Question:** You get a never-ending stream of: 

    Client: Application report for application_1477154041215_0013 (state: ACCEPTED)
    
**Answer:** You probably have too many simultaneous (potentially abandoned) spark shells running.
	
	ps -ef | grep -i spark
	kill -9 <spark process id>
	
