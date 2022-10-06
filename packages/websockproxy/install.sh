export PROXY_DOMAIN="my_proxy.domain.com"
export PROXY_DOMAIN_SUPPORT_EMAIL="support@my_proxy.domain.com"

docker rm -f relay && docker run --privileged --network host --name relay burggraf/pg_browser_websockproxy:1.0.5 &

sleep 120 # give time for initial start

crontab -l | { cat; echo "@reboot sleep 5 && docker rm -f relay && docker run --privileged --network host --name relay burggraf/pg_browser_websockproxy:1.0.5"; } | crontab -

apt install -y certbot
apt install -y cron
certbot certonly -d $PROXY_DOMAIN --standalone -n --agree-tos --email $PROXY_DOMAIN_SUPPORT_EMAIL
docker cp -L /etc/letsencrypt/live/$PROXY_DOMAIN/fullchain.pem relay:/root/fullchain.pem
docker cp -L /etc/letsencrypt/live/$PROXY_DOMAIN/privkey.pem relay:/root/privkey.pem
docker exec -it relay nginx # start nginx

crontab -l | { cat; echo "0 1 * * * certbot renew --standalone"; } | crontab -
crontab -l | { cat; echo "0 2 * * * docker cp -L /etc/letsencrypt/live/$PROXY_DOMAIN/fullchain.pem relay:/root/fullchain.pem"; } | crontab -
crontab -l | { cat; echo "0 2 * * * docker cp -L /etc/letsencrypt/live/$PROXY_DOMAIN/privkey.pem relay:/root/privkey.pem"; } | crontab -
