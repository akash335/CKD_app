import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from .preprocess import load_and_prepare


def main():
    data_path = "data/ckd_training.csv"
    model_path = "app/ml/saved_model.pkl"

    if not os.path.exists(data_path):
        raise FileNotFoundError("Place your training CSV at backend/data/ckd_training.csv")

    X_train, X_test, y_train, y_test, scaler = load_and_prepare(data_path)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, preds))
    print(classification_report(y_test, preds))

    joblib.dump({"model": model, "scaler": scaler}, model_path)
    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    main()
