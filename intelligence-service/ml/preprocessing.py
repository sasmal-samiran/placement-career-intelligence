import os
from pathlib import Path
import pandas as pd
import numpy as np

df1 = pd.read_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\raw\indian_engineering_placement_2026.csv"))
df2=pd.read_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\raw\student_career_success_dataset.csv"))

def preprocess_indian_engineering_placement_2026(df: pd.DataFrame):
    df=df.drop(columns=["Student_ID", "Gender", "State", "Package_LPA", "GitHub_Contributions", "Open_Source_Contributions", "Extracurricular_Activities", "Communication_Score"])

    ## handling missing values
    # df["Open_Source_Contributions"]=df["Open_Source_Contributions"].fillna(df["Open_Source_Contributions"].median())
    # df["LinkedIn_Activity_Score"]=df["LinkedIn_Activity_Score"].fillna(df["LinkedIn_Activity_Score"].mode()[0])

    df["LinkedIn_Profile"]=df["LinkedIn_Activity_Score"].apply(lambda x: 0 if x<=0 else 1)
    df=df.drop(columns=["LinkedIn_Activity_Score"], axis=1)

    ## Encoding categorical columns
    df["College_Tier"]=df["College_Tier"].map({
        "Tier-1": 1,
        "Tier-2": 2,
        "Tier-3": 3
    })
    df[["Leadership_Experience"]] = (
        df[["Leadership_Experience"]]
        .replace({"Yes": 1, "No": 0})
    )
    df["Placement_Status"]=df["Placement_Status"].map({
        "Placed": 1,
        "Not Placed": 0
    })

    ## Scaling
    def minmax_scale_to_0_100(series: pd.Series) -> pd.Series:
        s = series.astype(float)
        s_min = s.min()
        s_max = s.max()
        scaled = (s - s_min) / (s_max - s_min) * 100
        return scaled.round(0).astype(int)

    df["Competitive_Programming_Rating"]= minmax_scale_to_0_100(df["Competitive_Programming_Rating"])

    df.to_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\processed\indian_engineering_placement_2026.csv"), index=False)

    return df

def preprocess_student_career_success_dataset(df1: pd.DataFrame):
    df1=df1.drop(columns=["Student_ID", "Gender", "University_Year", "GitHub_Profile", "Resume_Score", "English_Proficiency", "Interview_Score", "Employability_Score", "Placement_Mode", "Company_Tier", 'Career_Field', "Starting_Salary_USD"])
    df1["Major"]=df1["Major"].map({
        "Computer Science": "CSE",
        "Software Engineering": "CSE",
        "Artificial Intelligence": "AIML",
        "Data Science": "AIML",
        "Cybersecurity": "IT",
        "Information Technology": "IT",
        "Business Analytics": "CSE",
        "Electrical Engineering": "EEE"
    })
    df1["College_Tier"]=3
    df1["CGPA"]=df1["CGPA"].apply(lambda x: (x*10)/4)
    df1["Soft_Skills_Score"]=df1[["Communication_Skills", "Teamwork"]].mean(axis=1)
    df1["Soft_Skills_Score"]=df1["Soft_Skills_Score"].apply(lambda x: int(x*10))

    df1["Aptitude_Score"]=df1[["Problem_Solving", "Programming_Skill"]].mean(axis=1)
    df1["Aptitude_Score"]=df1["Aptitude_Score"].apply(lambda x: int(x*10))

    df1=df1.drop(columns=["Communication_Skills", "Teamwork", "Problem_Solving"])

    df1[["Leadership_Experience", "LinkedIn_Profile"]] = (
            df1[["Leadership_Experience", "LinkedIn_Profile"]]
            .replace({"Yes": 1, "No": 0})
        )
    df1["Placement_Status"]=df1["Placement_Status"].map({
            "Placed": 1,
            "Not Placed": 0
        })

    np.random.seed(42)
    def generate_synthetic_features(row):
        prog_skill = row['Programming_Skill'] # Assumes 0-10
        academic_perf = row['Academic_Performance'].lower()
        
        # --- A. Academic Multiplier Setup ---
        # Convert text to a numerical multiplier
        academic_multiplier_map = {
            'poor': 0.7,
            'average': 0.8,
            'good': 0.9,
            'excellent': 1.0
        }
        # Default to 0.8 if the value is weird or missing
        multiplier = academic_multiplier_map.get(academic_perf, 0.8) 

        # --- B. Generate: competitive_coding_score (0-100) ---
        base_coding_score = (prog_skill * 10) * multiplier
        
        # Inject Gaussian Noise (mean=0, standard deviation=6)
        # This means scores will realistically fluctuate +/- 6 points from the base
        noise = np.random.normal(loc=0, scale=6)
        synthetic_coding_score = base_coding_score + noise
        
        # Clip to ensure it doesn't drop below 0 or exceed 100
        final_coding_score = int(np.clip(synthetic_coding_score, 0, 100))

        # --- C. Generate: dsa_problem_solved_number ---
        # Use Poisson distribution centered around different means based on skill level
        if prog_skill <= 3:
            # Low skill: usually solve very few problems
            base_lambda = 15 
        elif prog_skill <= 7:
            # Medium skill: moderately engaged
            base_lambda = 65 
        else:
            # High skill: highly engaged
            base_lambda = 150 
        
        # The Poisson distribution naturally provides a right-skewed realistic integer
        dsa_count = np.random.poisson(lam=base_lambda)
        
        # Add a slight boost based on academic performance to create correlation
        academic_bonus = int(multiplier * 10)
        final_dsa_count = dsa_count + academic_bonus

        return pd.Series([final_coding_score, final_dsa_count])

    df1[['Competitive_Programming_Rating', 'DSA_Problems_Solved']] = df1.apply(generate_synthetic_features, axis=1)

    df1 = df1.drop(columns=['Programming_Skill', 'Academic_Performance'])

    df1=df1.rename(columns={
        "Major": "Branch",
        "Projects_Completed": "Projects_Count",
        "Internships": "Internships_Count",
        "Certifications": "Certifications_Count",
        "Hackathons": "Hackathons_Participated",
    })
    feature_order = [
        'Age', 'Branch', 'College_Tier', 'CGPA', 'Attendance_Percentage',
        'DSA_Problems_Solved', 'Aptitude_Score', 'Projects_Count',
        'Internships_Count', 'Certifications_Count', 'Hackathons_Participated',
        'Competitive_Programming_Rating', 'Study_Hours_Per_Week',
        'Soft_Skills_Score', 'Leadership_Experience', 'LinkedIn_Profile', 'Placement_Status'
    ]
    df1=df1[feature_order]
    df1.to_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\processed\student_career_success_dataset.csv"), index=False)

preprocess_indian_engineering_placement_2026(df1)
preprocess_student_career_success_dataset(df2)