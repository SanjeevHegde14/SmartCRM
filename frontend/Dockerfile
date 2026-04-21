FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the built React UI (the dist folder) into the Docker container
COPY ./dist /app/dist

# Expose the mandatory Hugging Face port
EXPOSE 7860

# Run a dedicated lightweight web server hosting your built CSS, JS, and HTML flawlessly
CMD ["python", "-m", "http.server", "7860", "--directory", "dist"]
