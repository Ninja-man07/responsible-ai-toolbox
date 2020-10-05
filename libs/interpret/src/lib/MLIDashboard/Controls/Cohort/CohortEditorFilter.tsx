// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RangeTypes, roundDecimal } from "@responsible-ai/mlchartlib";
import {
  Checkbox,
  ComboBox,
  DefaultButton,
  IComboBox,
  IComboBoxOption,
  Position,
  PrimaryButton,
  SpinButton,
  Stack,
  Text
} from "office-ui-fabric-react";
import React from "react";

import { localization } from "../../../Localization/localization";
import { FabricStyles } from "../../FabricStyles";
import { FilterMethods, IFilter } from "../../Interfaces/IFilter";
import { IJointMeta, JointDataset } from "../../JointDataset";

export interface ICohortEditorFilterProps {
  openedFilter: IFilter;
  jointDataset: JointDataset;
  filterIndex?: number;
  filters: IFilter[];
  setSelectedProperty(
    ev: React.FormEvent<IComboBox>,
    item?: IComboBoxOption
  ): void;
  setAsCategorical(ev?: React.FormEvent, checked?: boolean): void;
  setCategoricalValues(
    ev?: React.FormEvent<IComboBox>,
    item?: IComboBoxOption
  ): void;
  setComparison(ev?: React.FormEvent<IComboBox>, item?: IComboBoxOption): void;
  setNumericValue(
    delta: number,
    column: IJointMeta,
    index: number,
    stringVal: string
  ): string | void;
  saveState(index?: number): void;
  cancelFilter(): void;
}
export class CohortEditorFilter extends React.Component<
  ICohortEditorFilterProps
> {
  private readonly dataArray: IComboBoxOption[] = new Array(
    this.props.jointDataset.datasetFeatureCount
  )
    .fill(0)
    .map((_, index) => {
      const key = JointDataset.DataLabelRoot + index.toString();
      return {
        key,
        text: this.props.jointDataset.metaDict[key].abbridgedLabel
      };
    });
  private comparisonOptions: IComboBoxOption[] = [
    {
      key: FilterMethods.Equal,
      text: localization.Filters.equalComparison
    },
    {
      key: FilterMethods.GreaterThan,
      text: localization.Filters.greaterThanComparison
    },
    {
      key: FilterMethods.GreaterThanEqualTo,
      text: localization.Filters.greaterThanEqualToComparison
    },
    {
      key: FilterMethods.LessThan,
      text: localization.Filters.lessThanComparison
    },
    {
      key: FilterMethods.LessThanEqualTo,
      text: localization.Filters.lessThanEqualToComparison
    },
    {
      key: FilterMethods.InTheRangeOf,
      text: localization.Filters.inTheRangeOf
    }
  ];
  public render(): React.ReactNode {
    const selectedMeta = this.props.jointDataset.metaDict[
      this.props.openedFilter.column
    ];
    const numericDelta =
      selectedMeta.treatAsCategorical ||
      selectedMeta.featureRange?.rangeType === RangeTypes.Integer ||
      !selectedMeta.featureRange
        ? 1
        : (selectedMeta.featureRange.max - selectedMeta.featureRange.min) / 10;
    const isDataColumn = this.props.openedFilter.column.includes(
      JointDataset.DataLabelRoot
    );
    let categoricalOptions: IComboBoxOption[] | undefined;
    // filterIndex is set when the filter is editing openedFilter and reset to filters.length otherwise
    const isEditingFilter =
      this.props.filterIndex !== this.props.filters.length;

    let minVal, maxVal;
    if (selectedMeta.treatAsCategorical || !selectedMeta.featureRange) {
      // Numerical values treated as categorical are stored with the values in the column,
      // true categorical values store indexes to the string values
      categoricalOptions = selectedMeta.sortedCategoricalValues?.map(
        (label, index) => {
          return { key: index, text: label };
        }
      );
    } else {
      minVal = roundDecimal(selectedMeta.featureRange.min);
      maxVal = roundDecimal(selectedMeta.featureRange.max);
    }
    return (
      <Stack tokens={{ childrenGap: "l1" }}>
        {isDataColumn && (
          <ComboBox
            styles={FabricStyles.limitedSizeMenuDropdown}
            options={this.dataArray}
            onChange={this.props.setSelectedProperty}
            label={localization.CohortEditor.selectFilter}
            selectedKey={this.props.openedFilter.column}
            calloutProps={FabricStyles.calloutProps}
          />
        )}
        {selectedMeta.featureRange &&
          selectedMeta.featureRange.rangeType === RangeTypes.Integer && (
            <Checkbox
              key={this.props.openedFilter.column}
              label={localization.CohortEditor.TreatAsCategorical}
              checked={selectedMeta.treatAsCategorical}
              onChange={this.props.setAsCategorical}
            />
          )}
        {selectedMeta.treatAsCategorical ? (
          <>
            <Text variant={"small"}>
              {`${localization.formatString(
                localization.Filters.uniqueValues,
                selectedMeta.sortedCategoricalValues?.length
              )}`}
            </Text>
            <ComboBox
              key={this.props.openedFilter.column}
              multiSelect
              label={localization.Filters.categoricalIncludeValues}
              selectedKey={this.props.openedFilter.arg}
              onChange={this.props.setCategoricalValues}
              options={categoricalOptions}
              useComboBoxAsMenuWidth={true}
              calloutProps={FabricStyles.calloutProps}
              styles={FabricStyles.limitedSizeMenuDropdown}
            />
          </>
        ) : (
          <>
            <Text block nowrap variant={"small"}>
              {`${localization.formatString(
                localization.Filters.min,
                minVal
              )} ${localization.formatString(
                localization.Filters.max,
                maxVal
              )}`}
            </Text>
            <ComboBox
              label={localization.Filters.numericalComparison}
              selectedKey={this.props.openedFilter.method}
              onChange={this.props.setComparison}
              options={this.comparisonOptions}
              useComboBoxAsMenuWidth={true}
              calloutProps={FabricStyles.calloutProps}
            />
            {selectedMeta.featureRange &&
              (this.props.openedFilter.method === FilterMethods.InTheRangeOf ? (
                <>
                  <SpinButton
                    labelPosition={Position.top}
                    value={this.props.openedFilter.arg[0].toString()}
                    label={localization.Filters.minimum}
                    min={selectedMeta.featureRange.min}
                    max={selectedMeta.featureRange.max}
                    onIncrement={(value): void => {
                      this.props.setNumericValue(
                        numericDelta,
                        selectedMeta,
                        0,
                        value
                      );
                    }}
                    onDecrement={(value): void => {
                      this.props.setNumericValue(
                        -numericDelta,
                        selectedMeta,
                        0,
                        value
                      );
                    }}
                    onValidate={(value): void => {
                      this.props.setNumericValue(0, selectedMeta, 0, value);
                    }}
                  />
                  <SpinButton
                    labelPosition={Position.top}
                    value={this.props.openedFilter.arg[1].toString()}
                    label={localization.Filters.maximum}
                    min={selectedMeta.featureRange.min}
                    max={selectedMeta.featureRange.max}
                    onIncrement={(value): void => {
                      this.props.setNumericValue(
                        numericDelta,
                        selectedMeta,
                        1,
                        value
                      );
                    }}
                    onDecrement={(value): void => {
                      this.props.setNumericValue(
                        -numericDelta,
                        selectedMeta,
                        1,
                        value
                      );
                    }}
                    onValidate={(value): void => {
                      this.props.setNumericValue(0, selectedMeta, 1, value);
                    }}
                  />
                </>
              ) : (
                <SpinButton
                  labelPosition={Position.top}
                  label={localization.Filters.numericValue}
                  min={selectedMeta.featureRange.min}
                  max={selectedMeta.featureRange.max}
                  value={this.props.openedFilter.arg[0].toString()}
                  onIncrement={(value): void => {
                    this.props.setNumericValue(
                      numericDelta,
                      selectedMeta,
                      0,
                      value
                    );
                  }}
                  onDecrement={(value): void => {
                    this.props.setNumericValue(
                      -numericDelta,
                      selectedMeta,
                      0,
                      value
                    );
                  }}
                  onValidate={(value): void => {
                    this.props.setNumericValue(0, selectedMeta, 0, value);
                  }}
                />
              ))}
          </>
        )}
        <Stack horizontal tokens={{ childrenGap: "l1" }}>
          {isEditingFilter ? (
            <>
              <Stack.Item>
                <PrimaryButton
                  text={localization.CohortEditor.save}
                  onClick={(): void =>
                    this.props.saveState(this.props.filterIndex)
                  }
                />
              </Stack.Item>
              <Stack.Item>
                <DefaultButton
                  text={localization.CohortEditor.cancel}
                  onClick={(): void => this.props.cancelFilter()}
                />
              </Stack.Item>
            </>
          ) : (
            <Stack.Item>
              <PrimaryButton
                text={localization.CohortEditor.addFilter}
                onClick={(): void =>
                  this.props.saveState(this.props.filters.length)
                }
              />
            </Stack.Item>
          )}
        </Stack>
      </Stack>
    );
  }
}