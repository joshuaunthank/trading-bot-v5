import React from "react";
import { useStrategy } from "../../context/StrategyContext";

// Import all step components
import StepMeta from "./steps/StepMeta";
import StepIndicators from "./steps/StepIndicators";
import StepModels from "./steps/StepModels";
import StepPostprocessing from "./steps/StepPostprocessing";
import StepSignals from "./steps/StepSignals";
import StepRisk from "./steps/StepRisk";
import StepReview from "./steps/StepReview";

// Define the steps
const steps = [
	{ label: "Meta", component: StepMeta },
	{ label: "Indicators", component: StepIndicators },
	{ label: "Models", component: StepModels },
	{ label: "Postprocessing", component: StepPostprocessing },
	{ label: "Signals", component: StepSignals },
	{ label: "Risk", component: StepRisk },
	{ label: "Review", component: StepReview },
];

const StrategyStepper: React.FC = () => {
	const { currentStep, setCurrentStep, isValid, saveStrategy } = useStrategy();

	// Handle next step button click
	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	// Handle previous step button click
	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	// Handle finish button click (save and navigate)
	const handleFinish = async () => {
		const success = await saveStrategy();
		if (success) {
			alert("Strategy saved successfully!");
			// Could navigate here if needed
		} else {
			alert("Failed to save strategy. Please check for errors and try again.");
		}
	};

	// Render the current step component
	const CurrentStepComponent = steps[currentStep].component;

	return (
		<div className="space-y-6">
			{/* Stepper Header */}
			<div className="flex justify-between items-center">
				{steps.map((step, index) => (
					<button
						key={index}
						onClick={() => setCurrentStep(index)}
						disabled={!isValid(currentStep) && index > currentStep}
						className={`flex-1 text-center py-2 ${
							index === currentStep
								? "border-b-2 border-blue-500 text-blue-500 font-medium"
								: "border-b border-gray-700 text-gray-400"
						} ${
							isValid(index)
								? "cursor-pointer hover:text-gray-300"
								: "cursor-not-allowed"
						}`}
					>
						{step.label}
					</button>
				))}
			</div>

			{/* Current Step Content */}
			<div className="py-6">
				<CurrentStepComponent />
			</div>

			{/* Navigation Buttons */}
			<div className="flex justify-between pt-4 border-t border-gray-700">
				<button
					onClick={handlePrevious}
					disabled={currentStep === 0}
					className={`px-4 py-2 bg-gray-600 text-white rounded ${
						currentStep === 0
							? "opacity-50 cursor-not-allowed"
							: "hover:bg-gray-700"
					}`}
				>
					Previous
				</button>

				{currentStep < steps.length - 1 ? (
					<button
						onClick={handleNext}
						disabled={!isValid(currentStep)}
						className={`px-4 py-2 bg-blue-600 text-white rounded ${
							!isValid(currentStep)
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-blue-700"
						}`}
					>
						Next
					</button>
				) : (
					<button
						onClick={handleFinish}
						disabled={!isValid(currentStep)}
						className={`px-4 py-2 bg-green-600 text-white rounded ${
							!isValid(currentStep)
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-green-700"
						}`}
					>
						Save Strategy
					</button>
				)}
			</div>
		</div>
	);
};

export default StrategyStepper;
