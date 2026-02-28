from outfit_scorer import outfit_score
import os
print("rec test")
base = os.path.dirname(os.path.abspath(__file__))

outfit = [
    os.path.join(base,"..", "..", "..", "data", "polyvore", "images", "373947_1.jpg"),
    os.path.join(base,"..", "..", "..", "data", "polyvore", "images", "373947_2.jpg"),
    os.path.join(base,"..", "..", "..", "data", "polyvore", "images", "373947_6.jpg")
]
outfit = [
    "214181831_1.jpg", 
    "120161271_1.jpg", 
    "143656996_1.jpg"
]
print("Score:", outfit_score(outfit))