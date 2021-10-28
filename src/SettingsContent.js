import React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import { CheckRounded as CheckRoundedIcon } from "@material-ui/icons";
import Button from "./Button";

import "./css/SettingsContent.css";

export default function SettingsContent (props) {
	return (
		<>
			<h1 className="settings-header">Settings</h1>
			<div className="settings-options-container">
				<label>
					<Checkbox
						checked={props.soundInput}
						onChange={props.handleSoundInputChange}
						inputProps={{ 'aria-label': 'checkbox' }}
					/>
					<span>Sound</span>
				</label>
				<label>
					<Checkbox
						checked={props.coloredEdgesInput}
						onChange={props.handleColoredEdgesInputChange}
						inputProps={{ 'aria-label': 'checkbox' }}
					/>
					<span>Coloured edges</span>
				</label>
			</div>

			<h2 className="settings-theme-header">Theme</h2>
			<div className="settings-options-container">
				{
					props.themes.map((theme) =>
						<Button
							onClick={() => props.handleThemeInputChange(theme)}
							icon={props.themeInput === theme && <CheckRoundedIcon />}
							className={`background--${theme}`}
							key={theme}
						>
							{
								theme.split("-")
									.map((word) =>
										word[0].toUpperCase() + word.substring(1)
									).join(" ")
							}
						</Button>
					)
				}
			</div>
		</>
	)
}
