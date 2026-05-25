#!/bin/bash
mkdir -p /home/ajith/jdk-21
wget -q https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz -O /home/ajith/jdk-21.tar.gz
tar -xzf /home/ajith/jdk-21.tar.gz -C /home/ajith/jdk-21 --strip-components=1
echo "JDK 21 setup complete."
