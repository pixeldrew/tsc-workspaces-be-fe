import './App.css';
import { MouseEventHandler, ReactElement } from 'react';

function App({
    idToken,
    logOut,
    patient,
    scopes,
}: {
    idToken?: IdToken;
    logOut: MouseEventHandler;
    patient?: string;
    scopes: string;
}): ReactElement {
    return (
        <div>
            <div className="card">

                <h2>Hello {idToken?.name}</h2>
                <p>
                    USERNAME: {idToken?.preferred_username}
                    <br />
                    SCOPES: {scopes}
                    <br />
                    PATIENT: {patient}
                </p>
                <p>FHIRUSER: {idToken?.fhirUser}</p>

                <button type="button" onClick={logOut}>
                    clear session
                </button>
            </div>
        </div>
    );
}

export default App;
