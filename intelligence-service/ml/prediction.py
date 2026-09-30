import pandas as pd
import joblib, os
from pathlib import Path

new_data = pd.DataFrame([{
    "Age": 22,
    "College_Tier": 3,
    "CGPA": 6.25,
    "Attendance_Percentage": 67.07,
    "DSA_Problems_Solved": 254,
    "Aptitude_Score": 75,
    "Projects_Count": 4,
    "Internships_Count": 1,
    "Certifications_Count": 3,
    "Hackathons_Participated": 2,
    "Competitive_Programming_Rating": 81,
    "Study_Hours_Per_Week": 21,
    "Soft_Skills_Score": 13,
    "Leadership_Experience": 0,
    "LinkedIn_Profile": 1,
    "Branch_CSE": True,
    "Branch_Chemical": False,
    "Branch_Civil": False,
    "Branch_ECE": False,
    "Branch_EEE": False,
    "Branch_IT": False,
    "Branch_Mechanical": False,
}])
branch_cols = [
    "Branch_CSE","Branch_EEE","Branch_IT","Branch_Chemical",
    "Branch_Civil","Branch_ECE","Branch_Mechanical"
]
new_data[branch_cols] = new_data[branch_cols].astype(int)

model1 = joblib.load(os.path.join(Path('__file__').resolve().parent,r"models\BalancedRandomForestClassifier.joblib"))
model2 = joblib.load(os.path.join(Path('__file__').resolve().parent,r"models\RandomForestClassifier.joblib"))
model3 = joblib.load(os.path.join(Path('__file__').resolve().parent,r"models\XGBClassifier.joblib"))

# print("\n===BalancedRandomForestClassifier===")
# pred = model1.predict(new_data)
# prob = model1.predict_proba(new_data)
# print("Prediction: ", "Placed" if pred==1 else "Not Placed")
# print("Probability: ", f"(Placed {round(prob[0,1]*100, 2)}%)\t", f"(Not Placed {round(prob[0,0]*100, 2)}%)")

print("\n===RandomForestClassifier===")
pred = model2.predict(new_data)
prob = model2.predict_proba(new_data)
print("Prediction: ", "Placed" if pred==1 else "Not Placed")
print("Probability: ", f"(Placed {round(prob[0,1]*100, 2)}%)\t", f"(Not Placed {round(prob[0,0]*100, 2)}%)")

# print("\n===XGBClassifier===")
# pred = model3.predict(new_data)
# prob = model3.predict_proba(new_data)
# print("Prediction: ", "Placed" if pred==1 else "Not Placed")
# print("Probability: ", f"(Placed {round(prob[0,1]*100, 2)}%)\t", f"(Not Placed {round(prob[0,0]*100, 2)}%)")