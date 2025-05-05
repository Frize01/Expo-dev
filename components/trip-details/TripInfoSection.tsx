import React from 'react';
import { Text, View } from 'react-native';
import { commonStyles } from '../../styles/common';

type TripInfoSectionProps = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  notes?: string;
};

export const TripInfoSection = ({ 
  destination, 
  startDate, 
  endDate, 
  budget, 
  notes 
}: TripInfoSectionProps) => {

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non définie";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <>
      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>Destination</Text>
        <Text style={commonStyles.sectionContent}>
          {destination || "Non renseignée"}
        </Text>
      </View>

      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>Dates du voyage</Text>
        <Text style={commonStyles.sectionContent}>
          Du {formatDate(startDate)} au{" "}
          {formatDate(endDate)}
        </Text>
      </View>

      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>Budget</Text>
        <Text style={commonStyles.sectionContent}>
          {budget ? `${budget} €` : "Non renseigné"}
        </Text>
      </View>

      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>Notes</Text>
        <Text style={commonStyles.sectionContent}>
          {notes || "Aucune note"}
        </Text>
      </View>
    </>
  );
};