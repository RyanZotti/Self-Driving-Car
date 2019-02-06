FROM ubuntu:18.04

RUN apt-get update -y
RUN apt-get install -y wget vim netcat net-tools gnupg2 lsb-core
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -sc)-pgdg main" > /etc/apt/sources.list.d/PostgreSQL.list'
RUN apt-get update -y
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata
RUN apt -y install postgresql-11
ENV PGDATA=/var/lib/postgresql/data
RUN service postgresql start -D /var/lib/postgresql/data
RUN initdb -D /usr/local/pgsql/data
