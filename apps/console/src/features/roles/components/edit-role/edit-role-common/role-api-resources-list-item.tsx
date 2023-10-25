/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
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

import { Grid, IconButton, ListItemText } from "@oxygen-ui/react";
import { ChevronDownIcon, XMarkIcon } from "@oxygen-ui/react-icons";
import Accordion from "@oxygen-ui/react/Accordion";
import AccordionDetails from "@oxygen-ui/react/AccordionDetails";
import AccordionSummary from "@oxygen-ui/react/AccordionSummary";
import Checkbox from "@oxygen-ui/react/Checkbox";
import ListItem from "@oxygen-ui/react/ListItem";
import { IdentifiableComponentInterface } from "@wso2is/core/models";
import { Tooltip } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { PermissionsList } from "./permissions-list";
import { APIResourceInterface, ScopeInterface } from "../../../models/apiResources";

interface RoleAPIResourcesListItemProp extends IdentifiableComponentInterface {
    /**
     * API resource.
     */
    apiResource: APIResourceInterface;
    /**
     * Initial selected permissions.
     */
    initialSelectedPermissions?: ScopeInterface[];
    /**
     * Selected permissions.
     */
    selectedPermissions: ScopeInterface[];
    /**
     * Callback to handle API resource removal.
     */
    onChangeScopes: (apiResource: APIResourceInterface, scopes: ScopeInterface[]) => void;
    /**
     * Callback to handle API resource removal.
     */
    onRemoveAPIResource: (apiResourceId: string) => void;
}

export const RoleAPIResourcesListItem: FunctionComponent<RoleAPIResourcesListItemProp> = 
    (props: RoleAPIResourcesListItemProp): ReactElement => {

        const {
            apiResource,
            initialSelectedPermissions,
            selectedPermissions,
            onChangeScopes,
            onRemoveAPIResource,
            [ "data-componentid" ]: componentId
        } = props;

        const { t } = useTranslation();

        // Check if all scopes are selected from the api resource
        const isAllScopesSelected = (): boolean => 
            apiResource?.scopes?.length === selectedPermissions?.length;
        
        /**
         * Handles the remove API resource action.
         */
        const handleRemoveAPIResource = () => {
            onRemoveAPIResource(apiResource?.id);
        };

        /**
         * Handles the select all scopes action.
         */
        const handleAllScopesSelection = () => {
            if (isAllScopesSelected()) {
                onChangeScopes(apiResource, []);
            } else {
                onChangeScopes(apiResource, apiResource?.scopes);
            }
        };

        return (
            <Accordion disableGutters defaultExpanded elevation={ 1 } variant="elevation">
                <AccordionSummary expandIcon={ <ChevronDownIcon /> }>
                    <ListItem
                        secondaryAction={ ( 
                            <Grid container alignItems="center" spacing={ 2 }>
                                <Grid>
                                    <Tooltip
                                        trigger={ (
                                            <Checkbox
                                                edge="end"
                                                checked={ isAllScopesSelected() }
                                                disabled={ apiResource?.scopes?.length < 0 }
                                                data-componentid = { `${componentId}-select-all` }
                                                onChange={ handleAllScopesSelection }
                                            />
                                        ) }
                                        content={ apiResource?.scopes?.length < 0 
                                            ? t("console:manage.features.roles.addRoleWizard.forms.rolePermission." +
                                                "permissions.tooltips.noScopes")
                                            : t("console:manage.features.roles.addRoleWizard.forms.rolePermission." +
                                                "permissions.tooltips.selectAllScopes")
                                        }
                                    />
                                </Grid>
                                <Grid>
                                    <Tooltip 
                                        trigger={ ( 
                                            <IconButton 
                                                data-componentid = { `${componentId}-remove` }
                                                onClick={ handleRemoveAPIResource }
                                            >
                                                <XMarkIcon />
                                            </IconButton>
                                        ) }
                                        content={ t("console:manage.features.roles.addRoleWizard.forms." +
                                            "rolePermission.permissions.tooltips.removeAPIResource") }
                                    >
                                    </Tooltip>
                                </Grid>
                            </Grid>
                        ) }
                        disablePadding
                    >  
                        <ListItemText primary={ apiResource?.name } />
                    </ListItem>
                </AccordionSummary>
                {
                    apiResource?.scopes?.length > 0 
                        ? (
                            <AccordionDetails>
                                <PermissionsList
                                    apiResource={ apiResource }
                                    initialSelectedPermissions={ initialSelectedPermissions }
                                    selectedPermissions={ selectedPermissions }
                                    onChangeScopes={ onChangeScopes }
                                />
                            </AccordionDetails>
                        ) : null
                }
            </Accordion>
        );
    };

/**
 * Default props for the component.
 */
RoleAPIResourcesListItem.defaultProps = {
    "data-componentid": "role-api-resources-list"
};
