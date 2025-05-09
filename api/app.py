from flask import Flask, request, Response, jsonify
import subprocess
import json
import time
import re
import sys
import threading
from flask_cors import CORS
import logging
import os

app = Flask(__name__)
# Enable CORS with more specific settings
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

@app.route('/')
def index():
    return jsonify({"status": "ok", "message": "Cryptarithmetic Solver API is running"})

@app.route('/solve')
def solve():
    logging.debug("Received request to /solve")
    word1 = request.args.get('word1', '')
    word2 = request.args.get('word2', '')
    word3 = request.args.get('word3', '')
    
    if not word1 or not word2 or not word3:
        return jsonify({"error": "Missing required parameters"}), 400
    
    def generate():
        # First, yield a response header to keep the connection open
        yield "data: {\"message\": \"Starting solver...\"}\n\n"
        
        # Get the directory where app.py is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.join(current_dir, "backend.py")

        # Run the Python script as a subprocess
        process = subprocess.Popen(
            [sys.executable, backend_path, word1, word2, word3],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
        
        # Variables to track state
        equations = []
        collecting_equations = False
        equations_sent = False
        assignments = {}
        domains = {}
        
        # Initialize line variable
        line = ""

        # Process output line by line
        for line in iter(process.stdout.readline, ''):
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
                
            # Collect equations
            if "Generated Equations:" in line:
                collecting_equations = True
                continue
                
            if collecting_equations and "Solving..." not in line:
                equations.append(line)
                continue
                
            if collecting_equations and "Solving..." in line:
                collecting_equations = False
                # Send collected equations
                yield f"data: {json.dumps({'equations': equations})}\n\n"
                equations_sent = True
                continue
            
            # Process equation being worked on
            if "Equation:" in line:
                equation = line.replace("Equation:", "").strip()
                yield f"data: {json.dumps({'message': f'Processing equation: {equation}', 'stepType': 'equation'})}\n\n"
                continue
                
            # Process selected letter
            if "Selected letter:" in line:
                letter = line.replace("Selected letter:", "").strip()
                yield f"data: {json.dumps({'message': f'Selected letter: {letter}', 'currentLetter': letter, 'stepType': 'select'})}\n\n"
                continue
                
            # Process assignments
            if "Assignments:" in line:
                try:
                    assignments_str = line.replace("Assignments:", "").strip()
                    # Safely evaluate the dictionary string
                    new_assignments = eval(assignments_str)
                    assignments.update(new_assignments)
                    
                    # Update domains based on assignments
                    for letter, value in new_assignments.items():
                        if value is not None and letter not in domains:
                            domains[letter] = [value]
                    
                    yield f"data: {json.dumps({'message': f'Updated assignments: {assignments_str}', 'mapping': assignments, 'domains': domains, 'stepType': 'assign'})}\n\n"
                except Exception as e:
                    print(f"Error parsing assignments: {e}")
                continue
                
            # Process first assignment
            if "First assigned:" in line:
                match = re.search(r"First assigned: (\w+) = (\d+)", line)
                if match:
                    letter, value = match.groups()
                    value = int(value)
                    yield f"data: {json.dumps({'message': f'First assignment: {letter} = {value}', 'assign': letter, 'value': value, 'stepType': 'first_assign'})}\n\n"
                continue
                
            # Process solution found
            if "Solution Found:" in line:
                yield f"data: {json.dumps({'message': 'Solution found!', 'stepType': 'solution_found'})}\n\n"
                continue
                
            # Process no solution
            if "No solution found" in line:
                yield f"data: {json.dumps({'message': 'No solution found.', 'stepType': 'no_solution'})}\n\n"
                yield f"data: {json.dumps({'done': True, 'assignments': {}})}\n\n"
                break
                
            # Extract final assignments
            if line.startswith("{") and line.endswith("}"):
                try:
                    final_assignments = eval(line)
                    yield f"data: {json.dumps({'done': True, 'assignments': final_assignments})}\n\n"
                    break
                except:
                    pass
            
            # Send other lines as progress updates
            yield f"data: {json.dumps({'message': line, 'stepType': 'progress'})}\n\n"
        
        # Check for errors
        stderr = process.stderr.read()
        if stderr:
            yield f"data: {json.dumps({'message': f'Error: {stderr}', 'stepType': 'error'})}\n\n"
        
        # Ensure we send a done event if we haven't already
        if not line.startswith("{") and "No solution found" not in line:
            yield f"data: {json.dumps({'done': True, 'assignments': assignments})}\n\n"
    
    # Set proper headers for SSE
    response = Response(generate(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Connection'] = 'keep-alive'
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)