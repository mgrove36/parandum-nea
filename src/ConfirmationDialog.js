import React from 'react';
import Button from './Button';

export default function ConfirmationDialog(props) {
	return (
		<>
			<div className="overlay" onClick={props.noFunction}></div>
			<div className="overlay-content confirmation-dialog">
				<h3>{props.message}</h3>
				<div className="button-container">
					<Button
						onClick={props.noFunction}
						loading={props.loading}
						disabled={props.loading}
					>
						No
					</Button>
					<Button
						onClick={props.yesFunction}
						loading={props.loading}
						disabled={props.loading}
					>
						Yes
					</Button>
				</div>
			</div>
		</>
	)
}
