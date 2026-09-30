import os
from pathlib import Path
import pandas as pd
import joblib

class PredictionService:
    @staticmethod
    async def predict_placement_probability(data):
        branch = data.branch.lower()\
        .strip()\
        .replace("&", "and")\
        .replace("/", "and")\
        .replace("-", "")\
        .replace("_", "")\
        .replace(" ", "")

        features = {
            "Branch_CSE": 0,
            "Branch_Chemical": 0,
            "Branch_Civil": 0,
            "Branch_ECE": 0,
            "Branch_EEE": 0,
            "Branch_IT": 0,
            "Branch_Mechanical": 0
        }

        branch_aliases = {

            "CSE": [
                "cse",
                "computerscience",
                "computerscienceengineering",
                "computerscienceandengineering",
            ],

            "Chemical": [
                "chemical",
                "chem",
                "chemicalengineering",
                "chemicalengineeringtechnology",
            ],

            "Civil": [
                "civil",
                "civilengineering",
                "civilengineeringand",
            ],

            "ECE": [
                "ece",
                "electronics",
                "electronicsandcommunication",
                "electronicsandcommunicationengineering",
                "electronicscommunicationengineering",
                "electronicsandtelecommunication",
                "electronicsandtelecommunicationengineering",
                "electronicandcommunicationengineering",
            ],

            "EEE": [
                "eee",
                "electrical",
                "electricalengineering",
                "electricalandelectronics",
                "electricalandelectronicsengineering",
                "electricalandelectronicengineering",
            ],

            "IT": [
                "it",
                "informationtechnology",
                "informationtechnologyengineering",
                "informationtech",
            ],

            "Mechanical": [
                "me",
                "mechanical",
                "mechanicalengineering",
                "mechanicalengineeringtechnology",
            ],

            "AIML": [
                "aiml",
                "aiandml",
                "aiandmachinelearning",
                "artificialintelligence",
                "artificialintelligenceandmachinelearning",
                "artificialintelligenceandml",
                "artificialintelligenceengineering",
                "artificialintelligenceandmachinelearningengineering",
                "machinelearning",
                "machinelearningengineering",
            ],
        }
        done=False
        for branch_name, aliases in branch_aliases.items():
            if branch in aliases:
                if branch_name != "AIML":
                    features[f"Branch_{branch_name}"] = 1 
                done=True
        if not done:
            raise ValueError(f"Unknown engineering branch: {branch}")
        
        new_data = pd.DataFrame([{
            "Age": data.age,
            "College_Tier": data.college_tier,
            "CGPA": data.cgpa,
            "Attendance_Percentage": data.attendance_percentage,
            "DSA_Problems_Solved": data.dsa_problems_solved,
            "Aptitude_Score": data.aptitude_score,
            "Projects_Count": data.projects_count,
            "Internships_Count": data.internships_count,
            "Certifications_Count": data.certifications_count,
            "Hackathons_Participated": data.hackathons_participated,
            "Competitive_Programming_Rating": data.competitive_programming_rating,
            "Study_Hours_Per_Week": data.study_hours_per_week,
            "Soft_Skills_Score": data.soft_skills_score,
            "Leadership_Experience": data.leadership_experience,
            "LinkedIn_Profile": data.linkedIn_profile,
            **features
        }])

        model = joblib.load(os.path.join(Path('__file__').resolve().parent.parent,r"models\RandomForestClassifier.joblib"))
        # pred = model.predict(new_data)
        prob = model.predict_proba(new_data)

        probability = round(prob[0,1]*100, 2)
        if probability >= 80:
            prediction = "High"
        elif probability >= 50:
            prediction = "Moderate"
        elif probability >= 30:
            prediction="Low"
        else:
            prediction="Very Low"
        
        return {
            "probability": probability,
            "prediction": prediction
        }
