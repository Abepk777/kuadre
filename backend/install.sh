php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php composer.phar require minishlink/web-push
php composer.phar require laravel-notification-channels/webpush
