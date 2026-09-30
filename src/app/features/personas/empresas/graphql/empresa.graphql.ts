import { gql } from 'apollo-angular';

export const EMPRESA_FRAGMENT = gql`
  fragment EmpresaFields on EmpresaOutput {
    id_empresa
    razon_social
    ruc
    direccion
    fecha_creacion
    telefono
    email
    actividad_economica
    logo
    activa
  }
`;

export const GET_EMPRESAS = gql`
  ${EMPRESA_FRAGMENT}
  query GetEmpresas {
    empresas {
      ...EmpresaFields
    }
  }
`;

export const GET_EMPRESA = gql`
  ${EMPRESA_FRAGMENT}
  query GetEmpresa($id: ID!) {
    empresa(id: $id) {
      ...EmpresaFields
    }
  }
`;

export const REGISTRAR_EMPRESA = gql`
  ${EMPRESA_FRAGMENT}
  mutation RegistrarEmpresa($input: EmpresaInput!) {
    registrarEmpresa(input: $input) {
      ...EmpresaFields
    }
  }
`;

export const ACTUALIZAR_EMPRESA = gql`
  ${EMPRESA_FRAGMENT}
  mutation ActualizarEmpresa($id: ID!, $input: EmpresaInput!) {
    actualizarEmpresa(id: $id, input: $input) {
      ...EmpresaFields
    }
  }
`;

export const ELIMINAR_EMPRESA = gql`
  mutation EliminarEmpresa($id: ID!) {
    eliminarEmpresa(id: $id)
  }
`;
