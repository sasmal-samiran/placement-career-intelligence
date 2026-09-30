import pandas as pd
import numpy as np
import os
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split, cross_val_score, cross_validate
from sklearn.model_selection import RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from imblearn.ensemble import BalancedRandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score, average_precision_score

df1 = pd.read_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\processed\indian_engineering_placement_2026.csv"))
df2 = pd.read_csv(os.path.join(Path('__file__').resolve().parent,r"datasets\processed\student_career_success_dataset.csv"))

df=pd.concat([df1,df2])
processed_df = pd.get_dummies(df, columns=['Branch'], drop_first=True)

X = processed_df.drop(columns=['Placement_Status'])
y = processed_df['Placement_Status']

# Split the data (stratify=y ensures the 75/25 split is maintained in both train and test)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

def train_BalancedRandomForestClassifier():
    print("Training BalancedRandomForestClassifier ===========")
    param_grid = {
        'n_estimators': [100, 200, 300, 500],
        'max_depth': [None, 5, 10, 20, 30],
        'min_samples_split': [2, 5, 10],
        'max_features': ['sqrt', 'log2']
    }
    scoring_metrics = ['accuracy', 'f1_macro', 'recall_macro']
    brf_model = BalancedRandomForestClassifier(
        random_state=42,    
        n_jobs=-1,         
        sampling_strategy='auto' 
    )
    random_search = RandomizedSearchCV(
        estimator=brf_model, 
        param_distributions=param_grid, 
        n_iter=20, 
        cv=5, 
        verbose=2,
        scoring=scoring_metrics,
        refit='recall_macro', 
        n_jobs=-1, # Uses all your computer's processor cores to speed it up
        random_state=42
    )
    # 4. Run the tuning process on your training data
    random_search.fit(X_train, y_train)

    # 5. See the results
    print("Best Parameters found: ", random_search.best_params_)
    print("Best Recal_Macro Score: ", random_search.best_score_)

    # You can now use the best model directly to make predictions
    best_rf = random_search.best_estimator_
    y_pred = best_rf.predict(X_test)
    y_probs=best_rf.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred)
    cr = classification_report(y_test, y_pred, digits=4)
    roc_auc = roc_auc_score(y_test, y_probs)
    pr_auc = average_precision_score(y_test, y_probs)

    # Convert confusion matrix to a nice string
    cm_str = np.array2string(
        cm,
        separator="\t",
        formatter={'int': '{:d}'.format}
    )

    # Build full report text
    report_text = (
        "=== Evaluation Metrics ===\n\n"
        f"Confusion Matrix:\n{cm_str}\n\n"
        f"Classification Report:\n{cr}\n"
        f"ROC-AUC Score: {roc_auc:.4f}\n"
        f"PR-AUC Score:  {pr_auc:.4f}\n"
    )

    # Write to txt file
    with open(os.path.join(Path('__file__').resolve().parent,r"models\metrics_BalancedRandomForestClassifier.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print("Metrics saved to evaluation_metrics.txt")

    joblib.dump(best_rf, os.path.join(Path('__file__').resolve().parent,r"models\BalancedRandomForestClassifier.joblib"))
    print("Best model saved successfully.")
    print("===========================================")

def train_RandomForestClassifier():
    print("Training RandomForestClassifier ===========")
    param_grid = {
        'n_estimators': [200, 250, 300, 500],
        'max_depth': [None, 5, 10, 20, 30],
        'min_samples_split': [2, 5, 10],
        'max_features': ['sqrt', 'log2'],
        'criterion': ['entropy', 'gini']
    }
    scoring_metrics = ['accuracy', 'f1_macro', 'recall_macro']
    rf_model = RandomForestClassifier(class_weight='balanced', random_state=42)
    random_search = RandomizedSearchCV(
        estimator=rf_model, 
        param_distributions=param_grid, 
        n_iter=20, 
        cv=5, 
        verbose=2,
        scoring=scoring_metrics, 
        refit='recall_macro',
        n_jobs=-1, # Uses all your computer's processor cores to speed it up
        random_state=42
    )
    # 4. Run the tuning process on your training data
    random_search.fit(X_train, y_train)

    # 5. See the results
    print("Best Parameters found: ", random_search.best_params_)
    print("Best Reacll Avg Score: ", random_search.best_score_)

    # You can now use the best model directly to make predictions
    best_rf = random_search.best_estimator_
    y_pred = best_rf.predict(X_test)
    y_probs=best_rf.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred)
    cr = classification_report(y_test, y_pred, digits=4)
    roc_auc = roc_auc_score(y_test, y_probs)
    pr_auc = average_precision_score(y_test, y_probs)

    # Convert confusion matrix to a nice string
    cm_str = np.array2string(
        cm,
        separator="\t",
        formatter={'int': '{:d}'.format}
    )

    # Build full report text
    report_text = (
        "=== Evaluation Metrics ===\n\n"
        f"Confusion Matrix:\n{cm_str}\n\n"
        f"Classification Report:\n{cr}\n"
        f"ROC-AUC Score: {roc_auc:.4f}\n"
        f"PR-AUC Score:  {pr_auc:.4f}\n"
    )

    # Write to txt file
    with open(os.path.join(Path('__file__').resolve().parent,r"models\metrics_RandomForestClassifier.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print("Metrics saved to evaluation_metrics.txt")
    joblib.dump(best_rf, os.path.join(Path('__file__').resolve().parent,r"models\RandomForestClassifier.joblib"))
    print("Best model saved successfully.")
    print("===========================================")

def train_XGBClassifier():
    print("Training RandomForestClassifier ===========")
    imbalance_ratio = len(y_train[y_train == 0]) / len(y_train[y_train == 1])
    print(f"Calculated scale_pos_weight: {imbalance_ratio:.2f}")

    # 3. Define the Hyperparameter Grid
    param_grid = {
        'max_depth': [3, 5, 7, 10, 20],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'n_estimators': [100, 200, 250, 300, 500],
        'subsample': [0.7, 0.8, 1.0],
        'colsample_bytree': [0.7, 0.8, 1.0]
    }

    # 4. Initialize XGBoost with the fixed scale_pos_weight
    xgb_model = XGBClassifier(
        scale_pos_weight=imbalance_ratio,
        eval_metric='logloss',
        random_state=42,
        n_jobs=-1
    )

    random_search = RandomizedSearchCV(
        estimator=xgb_model,
        param_distributions=param_grid,
        n_iter=20,          # Number of random combinations to try (increase if you have time)
        scoring='recall_macro', # The metric it will try to maximize
        cv=5,               # 5-fold cross-validation
        verbose=2,
        random_state=42,
        n_jobs=-1
    )

    # 6. Run the Tuning Process
    print("Starting hyperparameter tuning...")
    random_search.fit(X_train, y_train)

    best_xgb = random_search.best_estimator_

    print("\nBest Hyperparameters Found:")
    print(random_search.best_params_)

    print("\nEvaluating Best Model on Unseen Test Data:")
    y_pred = best_xgb.predict(X_test)
    y_probs=best_xgb.predict_proba(X_test)[:, 1]
    cm = confusion_matrix(y_test, y_pred)
    cr = classification_report(y_test, y_pred, digits=4)
    roc_auc = roc_auc_score(y_test, y_probs)
    pr_auc = average_precision_score(y_test, y_probs)

    # Convert confusion matrix to a nice string
    cm_str = np.array2string(
        cm,
        separator="\t",
        formatter={'int': '{:d}'.format}
    )

    # Build full report text
    report_text = (
        "=== Evaluation Metrics ===\n\n"
        f"Confusion Matrix:\n{cm_str}\n\n"
        f"Classification Report:\n{cr}\n"
        f"ROC-AUC Score: {roc_auc:.4f}\n"
        f"PR-AUC Score:  {pr_auc:.4f}\n"
    )

    # Write to txt file
    with open(os.path.join(Path('__file__').resolve().parent,r"models\metrics_XGBClassifier.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print("Metrics saved to evaluation_metrics.txt")
    joblib.dump(best_xgb, os.path.join(Path('__file__').resolve().parent,r"models\XGBClassifier.joblib"))
    print("Best model saved successfully.")
    print("===========================================")


# train_BalancedRandomForestClassifier()
# train_RandomForestClassifier()
train_XGBClassifier()