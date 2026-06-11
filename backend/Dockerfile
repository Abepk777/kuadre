FROM dunglas/frankenphp:1-php8.4-alpine

# Install required PHP extensions for Laravel Octane
RUN install-php-extensions \
    pcntl \
    pdo_pgsql \
    redis \
    zip \
    gd \
    bcmath

# Copy backend files
COPY . /app
WORKDIR /app
