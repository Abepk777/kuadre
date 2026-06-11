FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
# Copia los archivos del build
COPY --from=build /app/dist /usr/share/nginx/html

# --- IMPORTANTE: Eliminamos el default.conf original de la imagen ---
RUN rm /etc/nginx/conf.d/default.conf

# --- Copiamos TU archivo, que ahora se llama default.conf ---
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]