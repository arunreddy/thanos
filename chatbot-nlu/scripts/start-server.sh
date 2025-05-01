#!/bin/bash

# Build the rasa model, skip if the model already exists
if [ ! -d "models" ]; then
    rasa train
fi

# Start the Rasa server
rasa run --enable-api --cors "*" --endpoints endpoints.yml -v

