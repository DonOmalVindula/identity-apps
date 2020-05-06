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

import { AlertLevels } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import React, { FunctionComponent, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { updateIdentityProviderDetails } from "../../../api";
import { IdentityProviderAdvanceInterface } from "../../../models";
import { AdvanceConfigurationsForm } from "../forms";
import { handleIDPUpdateError } from "../utils";

/**
 * Proptypes for the advance settings component.
 */
interface AdvanceSettingsPropsInterface {
    /**
     * Currently editing idp id.
     */
    idpId: string;
    /**
     * Current advanced configurations.
     */
    advancedConfigurations: IdentityProviderAdvanceInterface;
    /**
     * Callback to update the idp details.
     */
    onUpdate: (id: string) => void;
}

/**
 *  Advance settings component.
 *
 * @param {AdvanceSettingsPropsInterface} props - Props injected to the component.
 * @return {ReactElement}
 */
export const AdvanceSettings: FunctionComponent<AdvanceSettingsPropsInterface> = (
    props: AdvanceSettingsPropsInterface
): ReactElement => {

    const {
        idpId,
        advancedConfigurations,
        onUpdate
    } = props;

    const dispatch = useDispatch();

    const { t } = useTranslation();

    /**
     * Handles the advanced config form submit action.
     *
     * @param values - Form values.
     */
    const handleAdvancedConfigFormSubmit = (values: any): void => {
        updateIdentityProviderDetails({ id: idpId, ...values })
            .then(() => {
                dispatch(addAlert({
                    description: t("devPortal:components.idp.notifications.updateIDP.success.description"),
                    level: AlertLevels.SUCCESS,
                    message: t("devPortal:components.idp.notifications.updateIDP.success.message")
                }));
                onUpdate(idpId);
            })
            .catch((error) => {
                handleIDPUpdateError(error);
            });
    };

    return (
        <>
            <div className="advanced-configuration-section">
                <AdvanceConfigurationsForm
                    config={ advancedConfigurations }
                    onSubmit={ handleAdvancedConfigFormSubmit }
                />
            </div>
        </>
    );
};
