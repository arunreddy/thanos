# How to Run the Database Selection Chatbot

## Prerequisites
- Python 3.8 or higher

## Installation

1. **Create and Activate a Virtual Environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

2. **Install Required Libraries**
   ```bash
   pip install rasa rasa-sdk
   ```

## Training the Model
Run the following command to train your model:
```bash
rasa train
```

## Running the Chatbot

1. **Start the Action Server**  
   Open a terminal with your virtual environment activated and run:
   ```bash
   rasa run actions
   ```

2. **Start the Rasa Shell**  
   In another terminal (with the virtual environment activated), run:
   ```bash
   rasa shell
   ```
