import React from "react";

interface Tab {
	id: string;
	label: string;
	icon?: React.ReactNode;
}

interface TabNavigationProps {
	tabs: Tab[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
	className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
	tabs,
	activeTab,
	onTabChange,
	className = "",
}) => {
	return (
		<div className={`border-b border-gray-700 ${className}`}>
			<nav className="-mb-px flex space-x-8">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
							activeTab === tab.id
								? "border-blue-500 text-blue-400"
								: "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
						}`}
					>
						{tab.icon && (
							<span className="inline-flex items-center mr-2">{tab.icon}</span>
						)}
						{tab.label}
					</button>
				))}
			</nav>
		</div>
	);
};

export default TabNavigation;
