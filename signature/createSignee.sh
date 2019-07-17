#!/bin/bash
composer identity issue -c admin@signature -u $2 -a "resource:com.pax.signature.Signee#$1" -f $2.card
sleep 1
composer card import -f $2.card
sleep 1
composer-rest-server -c $2@signature -n never -u true -w true -p $3