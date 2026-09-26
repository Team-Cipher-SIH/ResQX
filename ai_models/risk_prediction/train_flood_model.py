"""
train_flood_model.py

RESQTECH - FLOOD ML PIPELINE
Phase 3: Train the real flood Random Forest.

Uses ONLY the 4 features actually present in flood_training_dataset.csv:
    rainfall_1d, rainfall_3d, rainfall_7d, historicalFloodFrequency

Target: Flood_Occurred (0 or 1) - this is a BINARY classifier, not the
4-class (LOW/MODERATE/HIGH/CRITICAL) synthetic model used for fire/earthquake.
That's an intentional, honest difference: fire/earthquake use synthetic
domain-derived labels bucketed into 4 classes, flood uses REAL historical
binary outcomes (a flood either happened or it didn't on record).

Produces: models/flood_model.pkl
"""

import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
import joblib

DATA_FILE = os.path.join("data", "flood_training_dataset.csv")
MODEL_OUT = os.path.join("models", "flood_model.pkl")
RANDOM_STATE = 42

FEATURE_COLS = ["rainfall_1d", "rainfall_3d", "rainfall_7d", "historicalFloodFrequency"]
TARGET_COL = "Flood_Occurred"


def main():
    print("=" * 70)
    print("RESQTECH - FLOOD ML")
    print("PHASE 3: TRAIN REAL FLOOD MODEL")
    print("=" * 70)

    if not os.path.exists(DATA_FILE):
        print(
            f"[ERROR] {DATA_FILE} not found. Run building_training_data_final.py first."
        )
        return

    df = pd.read_csv(DATA_FILE)
    print(f"\nLoaded {len(df):,} rows from {DATA_FILE}")

    missing_cols = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing expected columns: {missing_cols}")
        return

    before = len(df)
    df = df.dropna(subset=FEATURE_COLS + [TARGET_COL])
    print(
        f"Rows after dropping missing values: {len(df):,} (removed {before - len(df):,})"
    )

    print("\nClass distribution:")
    print(df[TARGET_COL].value_counts())

    if df[TARGET_COL].nunique() < 2:
        print("\n[ERROR] Only one class present - cannot train a classifier.")
        print("Check that build_negative_examples() actually ran in Phase 2.")
        return

    X = df[FEATURE_COLS]
    y = df[TARGET_COL].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")

    # max_depth kept shallow (5) deliberately - with ~150-500 real rows, a deep
    # forest will overfit and memorize noise rather than learn real patterns.
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=5,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]  # probability of Flood_Occurred=1

    acc = accuracy_score(y_test, preds)
    print(f"\nTest accuracy: {acc:.3f}")

    try:
        auc = roc_auc_score(y_test, probs)
        print(
            f"Test ROC-AUC: {auc:.3f}  (0.5 = random guessing, 1.0 = perfect separation)"
        )
    except ValueError:
        print("ROC-AUC could not be computed (test set may lack both classes).")

    print("\nClassification report:")
    print(
        classification_report(
            y_test, preds, zero_division=0, target_names=["No Flood", "Flood"]
        )
    )

    print("Confusion matrix:")
    print("              Predicted No   Predicted Flood")
    cm = confusion_matrix(y_test, preds)
    print(f"Actual No       {cm[0][0]:>8}        {cm[0][1]:>8}")
    print(f"Actual Flood    {cm[1][0]:>8}        {cm[1][1]:>8}")

    print("\nFeature importances:")
    for feat, imp in sorted(
        zip(FEATURE_COLS, model.feature_importances_), key=lambda x: -x[1]
    ):
        print(f"  {feat:<28}: {imp:.3f}")

    os.makedirs("models", exist_ok=True)
    joblib.dump({"model": model, "features": FEATURE_COLS, "type": "binary"}, MODEL_OUT)


if __name__ == "__main__":
    main()
