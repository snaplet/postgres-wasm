#!/usr/bin/env bash

## Create and initialize TAP device ##
tunctl

ifconfig tap0 down
ifconfig tap0 10.5.0.1
ifconfig tap0 netmask 255.255.0.0
ifconfig tap0 mtu 1500
ifconfig tap0 up
######################

## IP Forwarding config for TAP device ##
echo 1 > /proc/sys/net/ipv4/ip_forward

/sbin/iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
/sbin/iptables -A FORWARD -i eth0 -o tap0 -m state --state RELATED,ESTABLISHED -j ACCEPT

#Drop any packages destined for the host machine or any other docker containers
#NOTE: double check that this matches your docker bridge subnet
/sbin/iptables -A FORWARD -i tap0 -o eth0 -d 172.17.0.0/16 -j DROP

/sbin/iptables -A FORWARD -i tap0 -o eth0 -j ACCEPT
/sbin/iptables-save
#########################################

/etc/init.d/dnsmasq start
nginx
python2 switchedrelay.py
