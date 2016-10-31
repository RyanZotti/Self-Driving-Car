## Instructions

Log into AWS and go to the EMR console. Create an EMR Spark cluster. I chose emr-4.7.1, since it comes with Spark 1.6.1, which is compatible with the latest version of H2O's Sparkling Water. I chose 8 m3.xlarge instances, which right now are $0.27 per instance per hour. Make sure you select security groups that let you ssh into the servers. 

Run thes
		
	# Open up a new Terminal tab. We're doing to do port forwarding / ssh tunneling to view the Spark UI
	ssh -i /Users/ryanzotti/Documents/private_keys/ML.pem -L 20888:52.87.220.197:20888 ec2-user@52.87.220.197
	
	# If you don't do this step your Spark code will immediately fail with permission issues
	sudo su hadoop
	hadoop fs -mkdir -p /user/ec2-user
	hadoop fs -chown ec2-user /user/ec2-user
	
	# Now back to being ec2-user
	
	# Download Sparking Water to /home/ec2-user/
	wget http://h2o-release.s3.amazonaws.com/sparkling-water/rel-1.6/1/sparkling-water-1.6.1.zip
	
	# Unzip the file
	unzip sparkling-water-1.6.1.zip
	
	sudo pip install h2o_pysparkling_1.6
	sudo pip install tabulate
	sudo pip install six
	sudo pip install future
	
	export SPARK_HOME=/usr/lib/spark
	export HADOOP_CONF_DIR=/etc/hadoop/conf
	export MASTER="yarn-client"
	
	# Start up pysparking
	# Note: --deploy-mode client doesn't fix EMR usage problem
	/home/ec2-user/sparkling-water-1.6.1/bin/pysparkling
	
	# Note the shell's tracking URL, which will look something like this:
	http://ip-10-0-0-123.ec2.internal:20888/proxy/application_1477154041215_0004/
	
	# Open up your web browser to the tracking URL. Replace the IP with localhost
	http://localhost:20888/proxy/application_1477154041215_0004/
	
	
## Tips

	# Get number of partitions
	rdd.getNumPartitions()
	
	# Log into Hue
	ssh -i /Users/ryanzotti/Documents/private_keys/ML.pem -L 8888:54.146.11.159:8888 ec2-user@54.146.11.159
	# Now go to localhost:8888 in your broswer
	# Make an account with a password (can be anything)
	
	# Where to find a Spark job's YARN logs on a worker node
	# /var/log/hadoop-yarn/containers
	
	# If YARN is killing your containers, the (Spark) stderror logs on the worker nodes won't help much. In fact, the stderr logs will be empty. stdout logs will say that the JVM ran out of memory and was killed. 
	
	# View stderr logs from Spark UI
	# 1. Go to the Executors tab
	# 2. Click stderror
	# 3. Replace the private ip with a public ip and hit refresh. If you can't use a public IP, try ssh tunneling into the worker node (note: I haven't tested that yet)
	# Example sterror url: http://54.145.239.26:8042/node/containerlogs/container_1477242042137_0001_01_000683/ec2-user/stderr?start=-4096
	
	# Check YARN logs for failed container of a job
	# SSH tunnel
	ssh -i /Users/ryanzotti/Documents/private_keys/ML.pem -L 8088:52.91.134.9:8088 ec2-user@52.91.134.9
	# In your browser, go to: http://localhost:8088/cluster/app/application_1477852274566_0003
	
	# YARN UI. Note I didn't have to ssh tunnel this
	# This tool shows how much memory is available on each worker node. When I ran my simple count on 10 m3.xlarge instances, YARN said I had used up nearly all memory on each node. This made sense because my job was taking forever. 
	http://<MasterPublicIP>:8088/cluster
	
	# Kill a zombie YARN job
	yarn application -kill application_1477242042137_0001
	
## FAQ

* **Problem:** You get a never-ending stream of: 

	    Client: Application report for application_1477154041215_0013 (state: ACCEPTED)
    
	**Solution:** You probably have too many simultaneous (potentially abandoned) spark shells running.
		
		ps -ef | grep -i spark
		kill -9 <spark process id>
	
* **Problem:** Your Spark jobs keeps failing with the following error:

	Container killed by YARN for exceeding memory limits
	
	**Solution:** Drammatically increase the number of partitions (eg., 10x). I went from 500 partitions to 5,000 and it solved my problem. 
		
		rdd = sc.textFile("s3n://self-driving-car/data/*/predictors_and_targets.csv",5000)

	**Problem:** You get the following error.
	
	`java.io.IOException: No FileSystem for scheme: s3n`
	
	**Solution:** Check out this answer: http://stackoverflow.com/questions/30851244/spark-read-file-from-s3-using-sc-textfile-s3n
	
		EXTRA_JARS=/Users/ryanzotti/Documents/RZ_Programs/Spark/spark-1.6.1-bin-hadoop2.6/extra_jars
		mkdir $EXTRA_JARS
		cd $EXTRA_JARS
		wget http://central.maven.org/maven2/org/apache/hadoop/hadoop-aws/2.7.3/hadoop-aws-2.7.3.jar
		# I used aws-java-sdk-1.11.49
		wget https://sdk-for-java.amazonwebservices.com/latest/aws-java-sdk.zip
		unzip aws-java-sdk.zip
	
* **Problem:** H2O keeps printing error messages.


		10-30 16:48:59.524 192.168.0.4:54321     65420  #5245-138 WARN: Swapping!  OOM, (K/V:164.5 MB + POJO:566.6 MB + FREE:250.9 MB == MEM_MAX:982.0 MB), desiredKV=122.8 MB OOM!
		10-30 16:48:59.524 192.168.0.4:54321     65420  #5245-138 WARN: Swapping!  OOM, (K/V:164.5 MB + POJO:566.6 MB + FREE:250.9 MB == MEM_MAX:982.0 MB), desiredKV=122.8 MB OOM!
		10-30 16:48:59.524 192.168.0.4:54321     65420  #5245-138 WARN: Swapping!  OOM, (K/V:164.5 MB + POJO:566.6 MB + FREE:250.9 MB == MEM_MAX:982.0 MB), desiredKV=122.8 MB OOM!

	**Solution:** Add more memory to Spark
	
		${PYSPARKLING_BIN}/pysparkling --driver-memory=6g --executor-memory=6g
	