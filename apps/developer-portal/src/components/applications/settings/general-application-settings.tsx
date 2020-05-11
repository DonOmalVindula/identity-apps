/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { hasRequiredScopes } from "@wso2is/core/helpers";
import { AlertLevels, SBACInterface, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { ConfirmationModal, ContentLoader, DangerZone, DangerZoneGroup } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteApplication, updateApplicationDetails } from "../../../api";
import {
    ApplicationInterface,
    ApplicationTemplateListItemInterface,
    ConfigReducerStateInterface,
    FeatureConfigInterface
} from "../../../models";
import { AppState } from "../../../store";
import { ApplicationManagementUtils } from "../../../utils";
import { GeneralDetailsForm } from "../forms";

/**
 * Proptypes for the applications general details component.
 */
interface GeneralApplicationSettingsInterface extends SBACInterface<FeatureConfigInterface>,
    TestableComponentInterface {

    /**
     * Application access URL.
     */
    accessUrl?: string;
    /**
     * Currently editing application id.
     */
    appId?: string;
    /**
     * Application description.
     */
    description?: string;
    /**
     * Is the application discoverable.
     */
    discoverability?: boolean;
    /**
     * Application logo URL.
     */
    imageUrl?: string;
    /**
     * Is the application info request loading.
     */
    isLoading?: boolean;
    /**
     * Name of the application.
     */
    name: string;
    /**
     * Callback to be triggered after deleting the application.
     */
    onDelete: () => void;
    /**
     * Callback to update the application details.
     */
    onUpdate: (id: string) => void;
    /**
     * Application template.
     */
    template?: ApplicationTemplateListItemInterface;
}

/**
 * Component to edit general details of the application.
 *
 * @param {GeneralApplicationSettingsInterface} props - Props injected to the component.
 *
 * @return {ReactElement}
 */
export const GeneralApplicationSettings: FunctionComponent<GeneralApplicationSettingsInterface> = (
    props: GeneralApplicationSettingsInterface
): ReactElement => {

    const {
        appId,
        name,
        description,
        discoverability,
        featureConfig,
        imageUrl,
        accessUrl,
        isLoading,
        onDelete,
        onUpdate,
        template,
        [ "data-testid" ]: testId
    } = props;

    const dispatch = useDispatch();

    const config: ConfigReducerStateInterface = useSelector((state: AppState) => state.config);

    const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState<boolean>(false);

    /**
     * Deletes an application.
     */
    const handleApplicationDelete = (): void => {
        deleteApplication(appId)
            .then(() => {
                dispatch(addAlert({
                    description: "Successfully deleted the application",
                    level: AlertLevels.SUCCESS,
                    message: "Delete successful"
                }));

                setShowDeleteConfirmationModal(false);
                onDelete();
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Application Delete Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while deleting the application",
                    level: AlertLevels.ERROR,
                    message: "Application Delete Error"
                }));
            });
    };

    /**
     * Handles form submit action.
     *
     * @param {ApplicationInterface} updatedDetails - Form values.
     */
    const handleFormSubmit = (updatedDetails: ApplicationInterface): void => {
        updateApplicationDetails(ApplicationManagementUtils.prefixTemplateNameToDescription(updatedDetails, template))
            .then(() => {
                dispatch(addAlert({
                    description: "Successfully updated the application",
                    level: AlertLevels.SUCCESS,
                    message: "Update successful"
                }));

                onUpdate(appId);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Update Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while updating the application",
                    level: AlertLevels.ERROR,
                    message: "Update Error"
                }));
            });
    };

    /**
     * Resolves the danger actions.
     *
     * @return {React.ReactElement} DangerZoneGroup element.
     */
    const resolveDangerActions = (): ReactElement => {
        if (!hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.update)) {
            return null;
        }

        if (config.ui.doNotDeleteApplications.includes(name)) {
            return null;
        }

        if (hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.delete)) {
            return (
                <DangerZoneGroup sectionHeader="Danger Zone">
                    {
                        hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.delete) &&
                        (
                            <DangerZone
                                actionTitle="Delete"
                                header="Delete application"
                                subheader={ "Once you delete an application, there is no going back. " +
                                "Please be certain." }
                                onActionClick={ (): void => setShowDeleteConfirmationModal(true) }
                                data-testid={ `${ testId }-danger-zone` }
                            />
                        )
                    }
                </DangerZoneGroup>
            );
        }

        return null;
    };

    return (
        !isLoading
            ? (
                <>
                    <GeneralDetailsForm
                        name={ name }
                        appId={ appId }
                        description={ description }
                        discoverability={ discoverability }
                        onSubmit={ handleFormSubmit }
                        imageUrl={ imageUrl }
                        accessUrl={ accessUrl }
                        readOnly={
                            !hasRequiredScopes(
                                featureConfig?.applications, featureConfig?.applications?.scopes?.update
                            )
                        }
                        data-testid={ `${ testId }-form` }
                    />
                    { resolveDangerActions() }
                    <ConfirmationModal
                        onClose={ (): void => setShowDeleteConfirmationModal(false) }
                        type="warning"
                        open={ showDeleteConfirmationModal }
                        assertion={ name }
                        assertionHint={ <p>Please type <strong>{ name }</strong> to confirm.</p> }
                        assertionType="input"
                        primaryAction="Confirm"
                        secondaryAction="Cancel"
                        onSecondaryActionClick={ (): void => setShowDeleteConfirmationModal(false) }
                        onPrimaryActionClick={ (): void => handleApplicationDelete() }
                        data-testid={ `${ testId }-application-delete-confirmation-modal` }
                    >
                        <ConfirmationModal.Header
                            data-testid={ `${ testId }-application-delete-confirmation-modal-header` }
                        >
                            Are you sure?
                        </ConfirmationModal.Header>
                        <ConfirmationModal.Message
                            attached
                            warning
                            data-testid={ `${ testId }-application-delete-confirmation-modal-message` }
                        >
                            This action is irreversible and will permanently delete the application.
                        </ConfirmationModal.Message>
                        <ConfirmationModal.Content
                            data-testid={ `${ testId }-application-delete-confirmation-modal-content` }
                        >
                            If you delete this application, you will not be able to get it back. All the applications
                            depending on this also might stop working. Please proceed with caution.
                        </ConfirmationModal.Content>
                    </ConfirmationModal>
                </>
            )
            : <ContentLoader/>
    );
};

/**
 * Default props for the application general settings component.
 */
GeneralApplicationSettings.defaultProps = {
    "data-testid": "application-general-settings"
};
