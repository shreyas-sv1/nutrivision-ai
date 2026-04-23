import argparse
import json
import os
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from torchvision.models import EfficientNet_B0_Weights
from sklearn.metrics import classification_report, accuracy_score, top_k_accuracy_score
import numpy as np

def main(args):
    # Create directories
    os.makedirs('datasets/food101', exist_ok=True)
    os.makedirs('ml_models/food_classifier', exist_ok=True)

    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Using device: {device}')

    # Data transforms
    train_transform = transforms.Compose([
        transforms.Resize(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_transform = transforms.Compose([
        transforms.Resize(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Dataset - auto downloads to ./datasets/food101
    train_dataset = datasets.Food101(
        root='datasets/food101', split='train', download=True, transform=train_transform
    )
    test_dataset = datasets.Food101(
        root='datasets/food101', split='test', download=True, transform=test_transform
    )

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=4)

    class_names = train_dataset.classes
    num_classes = len(class_names)
    print(f'Dataset loaded: {len(train_dataset)} train, {len(test_dataset)} test, {num_classes} classes')

    # Model
    model = models.efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
    
    # Freeze all layers
    for param in model.parameters():
        param.requires_grad = False

    # Replace classifier
    num_ftrs = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(num_ftrs, num_classes)
    )

    # Only classifier trainable
    for param in model.classifier.parameters():
        param.requires_grad = True

    model = model.to(device)

    # Loss, optimizer, scheduler
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)

    # Training loop
    best_val_acc = 0.0
    best_checkpoint = None

    for epoch in range(args.epochs):
        # Train
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

            if batch_idx % 100 == 99:
                print(f'Epoch {epoch+1}/{args.epochs}, Batch {batch_idx+1}, Loss: {running_loss/100:.4f}, Acc: {100.*correct/total:.2f}%')

                running_loss = 0.0

        scheduler.step()

        # Validation (using test set)
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
                all_preds.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        val_acc = 100. * val_correct / val_total
        avg_val_loss = val_loss / len(test_loader)

        print(f'Epoch {epoch+1}/{args.epochs} summary:')
        print(f'Train Acc: {100.*correct/total:.2f}%, Val Loss: {avg_val_loss:.4f}, Val Acc: {val_acc:.2f}%')

        # Save best
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            checkpoint = {
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_accuracy': val_acc / 100,
                'num_classes': num_classes,
                'class_names': class_names
            }
            best_checkpoint = checkpoint

    # Final evaluation
    print('Final test evaluation...')
    model.load_state_dict(best_checkpoint['model_state_dict'])
    model.eval()
    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())

    test_acc = accuracy_score(all_labels, all_preds)
    top5_acc = top_k_accuracy_score(all_labels, np.array(all_probs), k=5, labels=np.unique(all_labels))

    print(f'Final Test Accuracy (Top-1): {test_acc*100:.2f}%')
    print(f'Top-5 Accuracy: {top5_acc*100:.2f}%')

    # Classification report first 20 classes
    target_names = class_names[:20]
    print('\nClassification Report (first 20 classes):')
    print(classification_report(all_labels, all_preds, target_names=target_names, digits=3))

    # Save
    torch.save(best_checkpoint, 'ml_models/food_classifier/food_classifier.pth')
    with open('ml_models/food_classifier/class_names.json', 'w') as f:
        json.dump(class_names, f)

    print(f'Model saved at: ./ml_models/food_classifier/food_classifier.pth')
    print(f'Best Validation Accuracy: {best_val_acc:.2f}%')
    print(f'Top-5 Accuracy: {top5_acc*100:.2f}%')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=10)
    args = parser.parse_args()
    main(args)
