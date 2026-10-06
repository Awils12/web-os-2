#!/bin/bash
echo "Installing Web OS..."
pip install -r requirements.txt
echo ""
echo "Starting Web OS..."
python app.py
