import React from "react";
import StrategyEngineTestPanel from "../StrategyEngineTestPanel";

interface TestingTabProps {
	className?: string;
}

const TestingTab: React.FC<TestingTabProps> = ({ className = "" }) => {
	return (
		<div className={className}>
			<StrategyEngineTestPanel className="max-w-none" />
		</div>
	);
};

export default TestingTab;
