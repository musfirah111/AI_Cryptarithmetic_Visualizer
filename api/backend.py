import re
import itertools
import time
import sys

class CryptarithmeticSolver:
    def __init__(self, word1, word2, word3):
        # Storing the three words in uppercase.
        self.word1 = word1.upper()
        self.word2 = word2.upper()
        self.word3 = word3.upper()

        # Number of carry variables (length of word3).
        self.numberOfCarryVariables = len(word3)

        self.wordList = [word1, word2, word3]

        self.uniqueLetters = set(''.join(self.wordList))

        # Initialize the domains for each letter.
        self.domains = {}
        for letter in self.word1 + self.word2 + self.word3:
            if letter not in self.domains:
                self.domains[letter] = list(range(10))

        # First letter of each word cannot be zero.
        self.domains[self.word1[0]] = list(range(1, 10))
        self.domains[self.word2[0]] = list(range(1, 10))
        self.domains[self.word3[0]] = list(range(1, 10))

        # Leading letter is 1 if result is longer than operands
        if len(self.word3) > max(len(self.word1), len(self.word2)):
            leading_letter = self.word3[0]
            self.domains[leading_letter] = [1]
            # Remove 1 from all other domains
            for letter in self.domains:
                if letter != leading_letter and 1 in self.domains[letter]:
                    self.domains[letter].remove(1)

        # Carry variables and their domain.
        self.carryVariables = [f'Carry{i}' for i in range(len(self.word3) + 1)]
        for carry in self.carryVariables:
            self.domains[carry] = [0, 1]  # Initialize carry domains

        # Equations.
        self.Equations = []

        # Assignments dictionary.
        self.assignments = dict()

        print("Unique Letters:", self.uniqueLetters)
        print("Initialized Domains:", self.domains)

    # Function for finding the Equations.
    def equationGeneration(self):
        for i in range(len(self.word3)):
            sumOfColumn = []
            leftHandSide = []
            
            # Reading letters from left to right.
            # Letters from the current column - Operands
            if i < len(self.word1):
                sumOfColumn.append(self.word1[-(i+1)])

            if i < len(self.word2):
                sumOfColumn.append(self.word2[-(i+1)])
            # Letters of the result
            result = self.word3[-(i+1)]

            # Formulating Equation:
            # Add the carry if not at the first column.
            # Left Hand Side = Operand1 + Operand2 + Carry.
            if i > 0:
                leftHandSide.append(f"Carry{i}")

            leftHandSide.extend(sumOfColumn)
            leftHandSide = ' + '.join(leftHandSide)

            # Right Hand Side = result + 10*Next Carry
            if i < len(self.word3) - 1:
                rightHandSide = f"{result} + 10*Carry{i + 1}"
            else:# If the first column then just the result.
                rightHandSide = f"{result}"

            self.Equations.append(f"{leftHandSide} = {rightHandSide}")
        
        return self.Equations

    # Function for MRV (Minimum Remaning Value).
    def mrv(self):
        unassignedVariables = []
        for variable in self.domains:
            if variable not in self.assignments:
                unassignedVariables.append(variable)

        # Return 0 if all variables have been assigned.
        if len(unassignedVariables) == 0:
            return 0
        
        # Search for the variable with least domain size.
        smallestDomainLetter = unassignedVariables[0]
        for variable in unassignedVariables:
            if len(self.domains[variable]) < len(self.domains[smallestDomainLetter]):
                smallestDomainLetter = variable

        return smallestDomainLetter
    
    def lcv(self, letterByMRV, comboList):
        possibleValues = self.domains[letterByMRV]
        valueConstraints = []

        for value in possibleValues:
            constrainedCount = 0
            associatedCombos = []

            for combo in comboList:
                if letterByMRV in combo and combo[letterByMRV] == value:
                    associatedCombos.append(combo)
                    constrainedCount += 1

            valueConstraints.append((constrainedCount, value, associatedCombos))

        # Sort by least constraining
        valueConstraints.sort()

        sortedCombos = []
        for _, _, combos in valueConstraints:
            sortedCombos.extend(combos)

        return sortedCombos
    
    def isConsistent(self, letter, value):
        # Check if value is already assigned to another variable (AllDiff constraint).
        for assignedLetter in self.assignments:
            if self.assignments[assignedLetter] == value:
                return False
        return True
    
    # Function to remove a value from a letter variables' domain if it exists.
    def removeFromDomain(self, letter, value):
        if value in self.domains[letter]:
            self.domains[letter].remove(value)

    # Function to restore the letter's domain (used in backtracking).
    def restoreDomain(self, letter, value):
        if value not in self.domains[letter]:
            self.domains[letter].append(value)

    def forwardChecking(self, eq_index=0):
        # Base case: if all equations are processed, check if solution is valid
        if eq_index == len(self.Equations):
            return self.isSolutionValid()

        equation = self.Equations[::-1][eq_index]  # Process equations in reverse (right to left)
        print(f"Equation: {equation}")
        equation_eval = equation.replace('=', '==', 1)
        valid_combos = self.findValidCombinations(equation_eval)
        if not valid_combos:
            return False

        filteredCombinations = valid_combos
        # Get all unassigned variables in this equation
        variables = self.extractLettersFromEquations(equation)
        unassigned = [v for v in variables if v in self.domains and v not in self.assignments]
        if not unassigned:
            # All variables in this equation are already assigned, check and move to next
            return self.forwardChecking(eq_index + 1)

        selectedLetter = self.mrv()
        print(f"Selected letter: {selectedLetter}")

        sortedCombinations = self.lcv(selectedLetter, filteredCombinations)

        print(f"Combinations: {filteredCombinations}")
        for combo in filteredCombinations:
            # Check for consistency with current assignments (All-Diff)
            if all(self.isConsistent(var, val) for var, val in combo.items() if not var.startswith('Carry')):
                for var, val in combo.items():
                    self.assignments[var] = val

                print(f"Assignments: {self.assignments}")
                if len(self.assignments) == 1:
                    print(f"First assigned: {selectedLetter} = {combo[selectedLetter]}")

                if self.forwardChecking(eq_index):
                    return True

                # Backtrack
                for var in combo:
                    if var in self.assignments:
                        del self.assignments[var]

        return False

    def isSolutionValid(self):
        w1 = int(''.join(str(self.assignments[c]) for c in self.word1))
        w2 = int(''.join(str(self.assignments[c]) for c in self.word2))
        w3 = int(''.join(str(self.assignments[c]) for c in self.word3))
        return w1 + w2 == w3

    def extractLettersFromEquations(self, equation):
        return set(re.findall(r'[A-Za-z_][A-Za-z0-9_]*', equation))

    # Function to find the possible combinations.
    def findValidCombinations(self, equation):
        # Get all the letters in the equation.
        variables = self.extractLettersFromEquations(equation)

        assignedLetters = {}
        unassignedLetters = []

        for v in variables:
            if v in self.assignments:
                assignedLetters[v] = self.assignments[v]
            else:
                unassignedLetters.append(v)

        updatedEquation = equation
        for var, val in assignedLetters.items():
            updatedEquation = re.sub(rf'\b{re.escape(var)}\b', str(val), updatedEquation)

        domainOfUnassignedLetter = {}
        for letters in unassignedLetters:
            if letters in self.domains:
                domainOfUnassignedLetter[letters] = self.domains[letters]

        # Finding all possible combinations:
        validCombos = []

        for values in itertools.product(*domainOfUnassignedLetter.values()):
            assignments = dict(zip(unassignedLetters, values))

            # Early pruning: skip if letter values (not carry variables) are not unique
            letterValues = [v for k, v in assignments.items() if not k.startswith('Carry') and len(k) == 1]
            if len(set(letterValues)) != len(letterValues):
                continue  # Skip non-unique digit combinations early

            if eval(updatedEquation, {}, assignments):
                validCombos.append(assignments)

        return validCombos
    
    def applyAllDiffForLetters(self, valid_combos):
        filteredCombinations = []

        for combo in valid_combos:
            # Extract letters (exclude carry variables).
            letterValues = []
            carryValues = []

            # Iterate over each key-value pair in the combo dictionary.
            for key, value in combo.items():
                if not key.startswith('Carry') and len(key) == 1:  
                    letterValues.append(value) 
                elif key.startswith('Carry') and len(key) > 1:  
                    carryValues.append(value)   
                
            # Check if all letters have unique digits.
            if len(letterValues) == len(set(letterValues)):  
                filteredCombinations.append(combo)  

        return filteredCombinations

def main():
    if len(sys.argv) != 4:
        print("Usage: python backend.py <word1> <word2> <word3>")
        sys.exit(1)
        
    word1 = sys.argv[1]
    word2 = sys.argv[2]
    word3 = sys.argv[3]
    
    # Create a solver instance
    solver = CryptarithmeticSolver(word1, word2, word3)

    # Generate equations
    equations = solver.equationGeneration()
    print("Generated Equations:")
    for eq in equations:
        print(eq)

    # Measure time
    print("\nSolving...")
    start_time = time.time()

    result = solver.forwardChecking()

    end_time = time.time()
    elapsed_time = end_time - start_time
    minutes = int(elapsed_time // 60)
    seconds = elapsed_time % 60

    # Display result
    if result:
        print("\nSolution Found:")
        for letter, digit in solver.assignments.items():
            print(f"{letter} = {digit}")
    else:
        print("\nNo solution found.")

    print(f"\nTime taken: {minutes} minutes and {seconds:.2f} seconds")
    print(solver.assignments)

if __name__ == "__main__":  
    main()