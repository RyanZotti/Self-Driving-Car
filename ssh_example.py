# Delete this shortly after incorporating into real code
import paramiko

server = 'ryanzotti.local'
username = 'pi'
password = 'raspberry'
cmd_to_execute = 'ls -ltr'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(server, username=username, password=password)
ssh_stdin, ssh_stdout, ssh_stderr = ssh.exec_command(cmd_to_execute)
for line in ssh_stdout:
    print('... ' + line.strip('\n'))
client.close()