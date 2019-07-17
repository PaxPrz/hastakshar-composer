#!/bin/bash
rm *.card
composer network install -c PeerAdmin@hlfv1 -a ./dists/signature@0.0.13.bna
sleep 1
composer network start -c PeerAdmin@hlfv1 -n signature -V 0.0.13 -A admin -S adminpw -f networkAdmin.card
sleep 1
composer card import -f networkAdmin.card
sleep 1
composer-rest-server -c admin@signature -n never -u true -w true